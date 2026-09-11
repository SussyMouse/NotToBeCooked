"""The /rag/query route -- question in, grounded answer out, with database IO.

The order below is the whole design: retrieve, render, generate, **verify**,
then decide what to send. Verification sits between the model and the response
because `grounded` is a promise to the user, and a promise the model makes about
itself is not evidence.
"""

import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.schemas.chat import ChatRole, Message
from app.schemas.errors import ApiError
from app.schemas.rag import (
    Citation,
    RagAnswer,
    RagQueryRequest,
    RetrievedChunk,
    ScopeSnapshot,
)
from app.services.chat import get_or_create_conversation
from app.services.grounding import check_grounding
from app.services.llm import REFUSAL, LlmAnswer, LlmCitation, generate_answer
from app.services.prompt import build_context

logger = logging.getLogger(__name__)

rag_router = APIRouter(dependencies=[Depends(get_current_user)])


async def _retrieve(request: RagQueryRequest) -> list[RetrievedChunk]:
    """Placeholder for AI-1's retrieval step (Gantt r28)."""
    return []


def _placeholder_sources(request: RagQueryRequest, course_id: UUID) -> list[RetrievedChunk]:
    """Stand-in material so the frontend has something to render before r28.

    Only reachable under LLM_FAKE_MODE. It fabricates the *sources*, not the
    answer -- everything after this point is the production path, so the shape
    the UI receives is the shape it will receive for real. Delete this the day
    `_retrieve` returns rows.
    """
    file_ids = request.file_ids or [uuid4()]
    bodies = [
        "A partial index covers only the rows matching its WHERE clause, so it is "
        "smaller than a full index and is only usable when the query repeats that clause.",
        "A B-tree index stores keys in sorted order, which is why a range scan can walk "
        "the leaves without returning to the root.",
    ]
    return [
        RetrievedChunk(
            chunk_id=uuid4(),
            file_id=file_id,
            course_id=course_id,
            filename=f"Placeholder {index}.pdf",
            page_start=1,
            page_end=1,
            heading=None,
            content=bodies[(index - 1) % len(bodies)],
            score=1.0 - index * 0.1,
        )
        for index, file_id in enumerate(file_ids[:2], start=1)
    ]


def _resolve_citations(
    drafted: list[LlmCitation], selected: list[RetrievedChunk]
) -> list[Citation]:
    """Attach provenance the model was never asked for.

    The model supplies a marker and a quote. `file_id`, `course_id`, `filename`
    and `page` come from the chunk the marker resolves to -- never from the
    model, which would produce a well-formed UUID for a file that does not
    exist.

    A marker outside the range is dropped rather than clamped: there is no chunk
    to take provenance from, so there is no honest Citation to build. It does not
    escape unnoticed, because the marker is still written in the answer text and
    `check_grounding` reports it as cited-with-nothing-behind-it.
    """
    resolved: list[Citation] = []
    for item in drafted:
        if not 1 <= item.marker <= len(selected):
            continue
        source = selected[item.marker - 1]
        resolved.append(
            Citation(
                marker=item.marker,
                file_id=source.file_id,
                course_id=source.course_id,
                filename=source.filename,
                page=source.page_start,
                page_end=source.page_end,
                quote=item.quote,
            )
        )
    return resolved


@rag_router.post(
    "/query",
    response_model=RagAnswer,
    responses={
        401: {"model": ApiError, "description": "Missing, invalid or expired access token"},
        404: {"model": ApiError, "description": "Session or course not found"},
    },
)
async def query(
    request: RagQueryRequest,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> RagAnswer:
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or tampered token"},
        )

    # 1. Get or create conversation via services/chat.py
    first_line = next(
        (line.strip() for line in request.question.split("\n") if line.strip()), "New Chat"
    )
    clean_title = first_line[:40].strip() + ("..." if len(first_line) > 40 else "")
    conversation = await get_or_create_conversation(
        session=session,
        user_id=UUID(str(user_id)),
        course_id=request.course_id,
        conversation_id=request.conversation_id,
        title=clean_title or "New Chat",
    )

    if conversation.id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "SESSION_INIT_FAILED", "message": "Conversation ID was not initialized"},
        )
    conv_id: UUID = conversation.id

    # 2. Record the user turn. Stores the raw multiline text exactly as sent.
    session.add(
        Message(
            id=uuid4(),
            conversation_id=conv_id,
            scope_course_id=conversation.course_id,
            role=ChatRole.USER,
            content=request.question,
            grounded=False,
            citations=None,
            mentioned_file_ids=request.file_ids,
            created_at=datetime.now(UTC),
        )
    )

    # 3. Retrieve. Newlines are collapsed for the search and for the prompt; the
    #    stored user turn above keeps the original.
    clean_rag_query = " ".join(request.question.split()).strip()
    rag_request = request.model_copy(update={"question": clean_rag_query})

    chunks = await _retrieve(rag_request)
    if not chunks and settings.LLM_FAKE_MODE:
        chunks = _placeholder_sources(rag_request, conversation.course_id)

    context, selected = build_context(chunks)

    # 4. Generate.
    try:
        draft = await generate_answer(
            question=clean_rag_query, context=context, sources=selected
        )
    except Exception:
        # There is no retry. The user is already waiting on a chat turn and a
        # second timeout helps nobody; the traceback is for us, the refusal is
        # for them.
        logger.exception("generation failed: conversation_id=%s", conv_id)
        draft = LlmAnswer(answer=REFUSAL, grounded=False, citations=[])

    # 5. Verify, then decide. This is the step that makes `grounded` mean
    #    something: the model's own claim is an input to the decision, never the
    #    decision itself.
    citations = _resolve_citations(draft.citations, selected)
    report = check_grounding(draft.answer, citations, selected)

    if report.ok:
        answer_text = draft.answer
        grounded = bool(citations) and draft.grounded
    else:
        # Not a 500. The pipeline worked; the answer failed its own check, and
        # sending it with grounded=False would still put unverifiable citations
        # in front of the reader.
        logger.warning(
            "answer rejected by grounding check: conversation_id=%s problems=%s",
            conv_id,
            report.problems,
        )
        answer_text, citations, grounded = REFUSAL, [], False

    # 6. Record the assistant turn, with the scope frozen alongside it.
    #    ScopeSnapshot is written here and never updated: it is the evidence for
    #    re-checking this answer later, which is why it keeps chunk ids that a
    #    re-index will invalidate while `citations` deliberately does not (R14).
    snapshot = ScopeSnapshot(
        # The turn's scope as the request expressed it. None only when the
        # request carried neither a course nor @-mentions -- the whole corpus.
        # When file_ids is set it WAS the scope and this was ignored, which is
        # why both are recorded rather than one being folded into the other.
        scope_course_id=request.course_id,
        mentioned_file_ids=request.file_ids,
        retrieved_chunk_ids=[c.chunk_id for c in chunks],
        used_chunk_ids=[c.chunk_id for c in selected],
        embedding_model=settings.MODEL_TYPE,
    )

    session.add(
        Message(
            id=uuid4(),
            conversation_id=conv_id,
            scope_course_id=conversation.course_id,
            role=ChatRole.ASSISTANT,
            content=answer_text,
            grounded=grounded,
            citations=[c.model_dump(mode="json") for c in citations],
            mentioned_file_ids=request.file_ids,
            scope_snapshot=snapshot.model_dump(mode="json"),
            created_at=datetime.now(UTC),
        )
    )

    conversation.updated_at = datetime.now(UTC)
    await session.commit()

    return RagAnswer(
        answer=answer_text,
        citations=citations,
        grounded=grounded,
        # What actually went into the prompt, not how many citations came back.
        # A model that cited one of five sources still had five in front of it.
        used_chunks=len(selected),
        conversation_id=conv_id,
    )
