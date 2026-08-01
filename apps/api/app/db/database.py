# app/db/database.py
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings

# 1. Create Async Engine (asyncpg)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,  # Set to False in production
    future=True
)

# 2. Define async session
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# 3. Initialize DB and pgvector extension
async def init_db() -> None:
    async with engine.begin() as conn:
        # Ensure pgvector extension is enabled in PostgreSQL
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        # Create tables if not using Alembic migrations initially
        await conn.run_sync(SQLModel.metadata.create_all)

# 4. Dependency for FastAPI Router Endpoints
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
