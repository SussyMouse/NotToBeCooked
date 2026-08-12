"""C4 contract: the interface between retrieval (AI-1) and generation (AI-3).

Owned by AI-3. Retrieval must produce `RetrievedChunk` exactly as defined here;
any change to that shape needs agreement from AI-1.
"""

from app.core.config import settings
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel
from sqlalchemy import Computed, DateTime, ForeignKey, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import TSVECTOR
from pgvector.sqlalchemy import Vector


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
    page_number: Mapped[int]
    page_end: Mapped[int | None] = mapped_column(default=None, nullable=True)
    heading: Mapped[str | None] = mapped_column(default=None, nullable=True)
    content: Mapped[str]
    token_count: Mapped[int]
    embedding: Mapped[list[float] | None] = mapped_column(Vector(settings.EMBEDDINGS_DIM), nullable=True)
    content_tsv: Mapped[str | None] = mapped_column(
        TSVector(),
        Computed("to_tsvector('english', content)", persisted=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

class RagQueryRequest(SQLModel):
    """Inbound: frontend -> generation layer. A single question from the user."""

    model_config = {"extra": "forbid"}

    question: str = Field(..., min_length=1, max_length=2000)
    course_id: UUID | None = None
    file_ids: list[UUID] | None = None
    top_k: int = Field(default=5, ge=1, le=20)
    
class RetrievedChunk(SQLModel):
    """C4 internal: retrieval (AI-1) -> generation (AI-3).

    Request-scoped. This object is never serialised over HTTP and is discarded
    once the request completes.
    """

    model_config = {"extra": "forbid"}
    
    chunk_id: UUID = Field(
        ...,
        description="Request-scoped only, for de-duplication and debug logging. "
                    "MUST NOT be persisted in a Citation: chunk ids change whenever "
                    "the chunking strategy is re-run.",
    )
    file_id: UUID
    course_id: UUID
    filename: str = Field(..., min_length=1)
    page_number: int | None = Field(
        default=None, ge=1,
        description="First page of this chunk, 1-based, matching what the user and PDF "
                    "viewers see. Required for PDF sources; None for formats without pages.",
    )
    page_end: int | None = Field(default=None, ge=1)
    heading: str | None = Field(
        default=None,
        description="Section heading from the source document. None when the chunk has no "
                    "heading; do not substitute the filename here, that is a rendering decision.",
    )
    content: str = Field(..., min_length=1)
    score: float = Field(
        ...,
        description="Retrieval similarity score. Used by the grounding check to decide "
                    "whether anything relevant was found at all.",
    )

class Citation(SQLModel):
    """Outbound: generation -> frontend, and persisted into MESSAGE.citations.

    Deliberately anchored to file_id + page + quote and never to chunk_id:
    chunks are a regenerable intermediate product, while the file, the page and
    the quoted text survive re-ingestion.
    """

    model_config = {"extra": "forbid"}

    marker: int = Field(..., ge=1)
    file_id: UUID
    course_id: UUID
    filename: str = Field(..., min_length=1)
    page: int | None = Field(default=None, ge=1)
    page_end: int | None = Field(default=None, ge=1)
    quote: str = Field(
        ..., min_length=1,
        description="Verbatim excerpt the model relied on. Must be findable in the source "
                    "chunk; this is what makes a citation machine-checkable.",
    )
    
class RagAnswer(SQLModel):
    """Outbound: generation -> frontend. Response model of POST /rag/query."""

    model_config = {"extra": "forbid"}

    answer: str = Field(..., min_length=1)
    citations: list[Citation] = Field(default_factory=list)
    grounded: bool
    used_chunks: int = Field(
        ..., ge=0,
        description="How many chunks were actually retrieved. 0 means there was no material "
                    "and the layer should have refused to answer.",
    )