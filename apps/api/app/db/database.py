# app/db/database.py
from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

import app.models  # noqa: F401 -- register every table with SQLModel.metadata
from app.core.config import settings

# 1. Create Async Engine (asyncpg)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.SQL_ECHO,
    future=True,
)

# 2. Define async session
async_session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


# 3. Initialize DB and pgvector extension
async def init_db() -> None:
    # RETIRING -- both lines below leave this function on 19 Aug 2026, in the same
    # commit as the first migration. Not before: until that migration exists,
    # create_all is the only thing that builds tables, and removing it early
    # breaks every local database that gets recreated in the meantime.
    #
    # What that commit does:
    #   1. CREATE EXTENSION moves to the top of the first migration. It cannot
    #      stay here -- CI and any fresh machine run `alembic upgrade head`
    #      without ever calling init_db(), and CHUNK.embedding needs the
    #      extension in place before vector(1024) will build.
    #   2. create_all goes. It creates tables without writing anything to
    #      alembic_version, so Alembic then believes no migration has ever run
    #      and tries to create tables that already exist. Two record-keepers,
    #      neither aware of the other.
    #   3. Every database that already has tables gets `alembic stamp head` once,
    #      by hand -- Lim's, Calvin's, Bao Sheng's, and the OCI box.
    # After that, `alembic upgrade head` is a deploy step, not a startup step:
    # a failed migration should stop the deployment, not half-start the app.
    async with engine.begin() as conn:
        # Ensure pgvector extension is enabled in PostgreSQL
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        await conn.run_sync(SQLModel.metadata.create_all)


# 4. Dependency for FastAPI Router Endpoints
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
