from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession


async def create_conversation(course_id: UUID, session: AsyncSession, title: str):
    pass

async def save_message():
    pass

async def get_conversation_history():
    pass