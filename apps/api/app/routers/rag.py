"""The /rag/query route — question in, grounded answer out.

Currently a skeleton: it validates the request, applies the scope-precedence rule
from `RagQueryRequest`, and returns a refusal. Retrieval (AI-1) and the Gemini
call are wired in next; the shape of the response is already the C4 contract, so
the chat UI can build against it today.
"""

from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.schemas.rag import RagAnswer, RagQueryRequest, RetrievedChunk
from app.services.prompt import build_context

rag_router = APIRouter(dependencies=[Depends(get_current_user)])


async def _retrieve(request: RagQueryRequest) -> list[RetrievedChunk]:
    """Placeholder for AI-1's retrieval step.

    Deliberately returns nothing rather than raising: the no-evidence path is a
    real case the generation layer has to handle correctly, so exercising it is
    more useful than a NotImplementedError.

    Scope precedence is documented on `RagQueryRequest` and must be honoured
    here: `file_ids`, when present, IS the scope and `course_id` is ignored.
    ANDing them returns nothing whenever a mention points outside the current
    course, which US-12 makes a normal case.
    """

    return []


@rag_router.post("/query", response_model=RagAnswer)
async def query(request: RagQueryRequest) -> RagAnswer:
    chunks = await _retrieve(request)
    _context, selected = build_context(chunks)

    if not selected:
        return RagAnswer(
            answer="The supplied material does not cover this question.",
            citations=[],
            grounded=False,
            used_chunks=0,
        )

    raise NotImplementedError("generation is wired in §4.3")
