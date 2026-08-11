"""C4 contract: the interface between retrieval (AI-1) and generation (AI-3).

Owned by AI-3. Retrieval must produce `RetrievedChunk` exactly as defined here;
any change to that shape needs agreement from AI-1.
"""

from sqlmodel import Field, SQLModel
from uuid import UUID

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