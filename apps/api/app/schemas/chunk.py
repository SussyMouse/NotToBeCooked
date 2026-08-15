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
    file_id: Mapped[UUID] = mapped_column(ForeignKey("file.id"))
    chunk_index: Mapped[int]
    page_number: Mapped[int | None]
    page_end: Mapped[int | None] = mapped_column(default=None, nullable=True)
    heading: Mapped[str | None] = mapped_column(default=None, nullable=True)
    content: Mapped[str]
    token_count: Mapped[int]
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDINGS_DIM), nullable=True)
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
    file_id: UUID
    chunk_index: int  # 它在文件中的顺序
    page_number: int | None = None
    page_end: int | None = None
    heading: str | None = None
    content: str
    token_count: int
