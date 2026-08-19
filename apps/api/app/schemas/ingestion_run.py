from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class IngestionRunStatus(StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class IngestionRun(SQLModel, table=True):
    __tablename__ = "ingestion_run"  # pyright: ignore[reportAssignmentType]

    id: UUID | None = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    file_id: UUID = Field(foreign_key="file.id")

    status: IngestionRunStatus = Field(default=IngestionRunStatus.QUEUED)

    chunker_version: str

    embedding_model: str

    embedding_dim: int

    is_active: bool = Field(default=False)

    started_at: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)
    error_message: str | None = Field(default=None)
