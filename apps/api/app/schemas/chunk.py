from datetime import UTC, datetime
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from pydantic import BaseModel
from sqlalchemy import Computed, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator
from sqlmodel import SQLModel

EMBEDDINGS_DIM = 1024


class TSVector(TypeDecorator):
    impl = TSVECTOR
    cache_ok = True


class Base(DeclarativeBase):
    metadata = SQLModel.metadata


# Must use SQL Alchemy here to pass pyright and prevent runtime error
class Chunk(Base):
    __tablename__ = "chunk"
    __table_args__ = (
        Index(
            "chunk_embedding_idx",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index(
            "chunk_content_tsv_idx",
            "content_tsv",
            postgresql_using="gin",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    # Which run produced this chunk. Held back until 20 Aug only because a
    # foreign key to a table with no model breaks mapper configuration for the
    # whole app -- AI-2 had it right in 5f6bc15 and lost it to a merge. It is
    # what R5 constrains retrieval by (two models at the same width produce
    # incomparable vectors) and what R18's UNIQUE (ingestion_run_id, chunk_index)
    # attaches to.
    ingestion_run_id: Mapped[UUID] = mapped_column(
        ForeignKey("ingestion_run.id", ondelete="CASCADE")
    )
    file_id: Mapped[UUID] = mapped_column(ForeignKey("file.id", ondelete="CASCADE"))
    # Denormalised on purpose: this is the filter in front of the HNSW scan.
    # Without it, scoping by course needs chunk -> file -> course, and that
    # join has to run before the vector scan.
    course_id: Mapped[UUID] = mapped_column(ForeignKey("course.id", ondelete="CASCADE"))
    chunk_index: Mapped[int]
    page_start: Mapped[int | None]
    page_end: Mapped[int | None] = mapped_column(default=None, nullable=True)
    heading: Mapped[str | None] = mapped_column(default=None, nullable=True)
    content: Mapped[str]
    token_count: Mapped[int]
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDINGS_DIM), nullable=False)
    content_tsv: Mapped[str | None] = mapped_column(
        TSVector(),
        Computed("to_tsvector('english', content)", persisted=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )


class ChunkCreate(BaseModel):  # 描述 AI-2 切出来的“一块内容”应该包含哪些资料。
    # Deliberately no ingestion_run_id and no course_id, though the Chunk table
    # has both. A chunker is handed one file; it does not know which run it is
    # part of, and it does not know the file's course. The processor knows both
    # -- it opened the run, and it can reach the course through the file -- and
    # fills them when it turns a ChunkCreate into a Chunk row.
    file_id: UUID
    chunk_index: int  # 它在文件中的顺序
    page_start: int | None = None
    page_end: int | None = None
    heading: str | None = None
    content: str
    token_count: int
