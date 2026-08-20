from collections.abc import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.schemas.chat import (
    Conversation,
    ConversationDetail,
    DeleteSessionResponse,
    Message,
    MessageRead,
)
from app.schemas.course import Course
from app.schemas.errors import ApiError

chat_router = APIRouter()


@chat_router.get(
    "/sessions",
    response_model=Sequence[Conversation],
    responses={401: {"model": ApiError, "description": "Missing, invalid or expired access token"}},
)
async def get_sessions(
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
    course_id: UUID | None = Query(default=None, description="Filter sessions by course ID"),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """Get any latest sessions or by course ID"""
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or tampered token"},
        )

    # Ownership derives through course -> user. Conversation.user_id and the
    # conversationcourselink junction table were removed by Decision 1 (18 Aug).
    statement = (
        select(Conversation)
        .join(Course, col(Conversation.course_id) == col(Course.id))
        .where(col(Course.user_id) == user_id)
    )

    if course_id:
        statement = statement.where(col(Conversation.course_id) == course_id)

    statement = statement.order_by(col(Conversation.updated_at).desc()).offset(offset).limit(limit)
    result = await session.execute(statement)
    conversations = result.scalars().all()

    return conversations


@chat_router.get(
    "/sessions/{session_id}",
    response_model=ConversationDetail,
    responses={
        401: {"model": ApiError, "description": "Missing, invalid or expired access token"},
        404: {"model": ApiError, "description": "Session not found"},
    },
)
async def get_session_by_session_id(
    session_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    """Get session messages"""
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or tampered token"},
        )

    statement = (
        select(Conversation)
        .join(Course, col(Conversation.course_id) == col(Course.id))
        .where(col(Conversation.id) == session_id, col(Course.user_id) == user_id)
    )
    result = await session.execute(statement)
    conversation = result.scalar_one_or_none()

    if conversation is None or conversation.id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SESSION_NOT_FOUND", "message": "No session found"},
        )

    msg_statement = (
        select(Message)
        .where(col(Message.conversation_id) == session_id)
        .order_by(col(Message.created_at).asc())
    )
    msg_result = await session.execute(msg_statement)
    messages = msg_result.scalars().all()

    return ConversationDetail(
        id=conversation.id,
        course_id=conversation.course_id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[MessageRead.model_validate(m) for m in messages],
    )


@chat_router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_200_OK,
    response_model=DeleteSessionResponse,
    responses={
        401: {"model": ApiError, "description": "Missing, invalid or expired access token"},
        404: {"model": ApiError, "description": "Session not found"},
    },
)
async def delete_session(
    session_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or tampered token"},
        )

    statement = (
        select(Conversation)
        .join(Course, col(Course.id) == col(Conversation.course_id))
        .where(
            Course.user_id == user_id,
            Conversation.id == session_id
        )
    )
    result = await session.execute(statement)
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SESSION_NOT_FOUND", "message": "No session found under user_id"},
        )

    await session.delete(conversation)
    await session.commit()

    return DeleteSessionResponse(status="ok")
