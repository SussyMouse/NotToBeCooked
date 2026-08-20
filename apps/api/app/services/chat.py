from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from app.schemas.chat import Conversation
from app.schemas.course import Course


async def get_or_create_conversation(
    session: AsyncSession,
    user_id: UUID | str,
    course_id: UUID | None,
    conversation_id: UUID | None,
    title: str | None = None,
) -> Conversation:
    """Gets an existing conversation or creates a new one.

    - If conversation_id is provided: verifies ownership via Course -> User and returns it.
    - If course_id is provided: verifies course ownership and creates a new Conversation.
    - If neither is provided: raises 400 Bad Request.
    """
    uid = UUID(user_id) if not isinstance(user_id, UUID) else user_id

    if conversation_id:
        statement = (
            select(Conversation)
            .join(Course, col(Conversation.course_id) == col(Course.id))
            .where(
                col(Course.user_id) == uid,
                col(Conversation.id) == conversation_id,
            )
        )
        result = await session.execute(statement)
        conversation = result.scalar_one_or_none()

        if conversation:
            return conversation
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SESSION_NOT_FOUND", "message": "No session found"},
        )

    elif course_id:
        statement = (
            select(Course)
            .where(col(Course.user_id) == uid)
            .where(col(Course.id) == course_id)
        )
        result = await session.execute(statement)
        course = result.scalar_one_or_none()

        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "COURSE_NOT_FOUND", "message": "No course found under the user_id"},
            )

        new_conversation = Conversation(
            course_id=course_id,
            title=title or "Untitled Conversation",
        )
        session.add(new_conversation)
        await session.commit()
        await session.refresh(new_conversation)
        return new_conversation

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_REQUEST", "message": "Either course_id or conversation_id must be provided"},
        )
