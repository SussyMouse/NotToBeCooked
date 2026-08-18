from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, Column, DateTime
from sqlmodel import Field, SQLModel


class FileStatus(Enum):
    """`uploaded` restored 18 Aug.

    Upload and ingestion are separate endpoints, so a file that has been stored
    but not yet queued had no state to sit in and was being mislabelled
    `processing`. The ERD has carried four values since 27 Jul.
    """

    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class File(SQLModel, table=True):
    id: UUID | None = Field(primary_key=True, default_factory=uuid4)
    # TODO(r41, 19 Aug): becomes `folder_id -> folder.id` once AI-2 delivers the
    # FOLDER model (Decision 1 option A, Decision 5). Course is then derived
    # through the folder rather than stored again. Held here because a foreign
    # key to a table with no model breaks mapper configuration.
    course_id: UUID = Field(foreign_key="course.id", ondelete="CASCADE")
    filename: str
    storage_key: str = Field(
        unique=True,
        description="Object-store key, not a filesystem path. UNIQUE because two rows must "
        "not claim the same stored object.",
    )
    sha256: str | None = Field(
        default=None,
        description="Content checksum. Deliberately NOT unique -- finding R7: a global "
        "UNIQUE would reject the second student to upload the same lecture slides.",
    )
    mime_type: str
    size_bytes: int = Field(sa_column=Column(BigInteger, nullable=False))
    page_count: int | None = None
    status: FileStatus = Field(default=FileStatus.UPLOADED)
    error_message: str | None = None
    uploaded_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    indexed_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
        description="Set when an ingestion run for this file reaches `ready`. Distinguishes "
        "a stored file from an indexed one without joining INGESTION_RUN.",
    )


class FileRead(SQLModel):
    """Outbound shape for a file."""

    id: UUID
    course_id: UUID
    filename: str
    storage_key: str
    sha256: str | None = None
    mime_type: str
    size_bytes: int
    page_count: int | None = None
    status: Literal["uploaded", "processing", "ready", "failed"]
    error_message: str | None = None
    uploaded_at: datetime
    indexed_at: datetime | None = None


class IngestionRequest(SQLModel):
    file_id: UUID


class IngestionResponse(SQLModel):
    file_id: UUID
    status: Literal["uploaded", "processing", "ready", "failed"]
    chunk_count: int | None = None
    error: str | None = None
