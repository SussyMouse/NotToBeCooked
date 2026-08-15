from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.rag import Citation


async def create_conversation(course_id: UUID, title: str, session: AsyncSession):
    pass


async def save_message(
    conversation_id: UUID,
    role: str,
    content: str,
    citations: list[Citation],
    mentioned_file_ids: list[UUID],
    session: AsyncSession,
):
    pass


async def get_conversation_history(conversation_id: UUID, session: AsyncSession, limit: int = 10):
    pass
