from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, SmallInteger
from sqlmodel import DateTime, Field, SQLModel


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

    file_id: UUID = Field(foreign_key="file.id", ondelete="CASCADE")

    status: IngestionRunStatus = Field(default=IngestionRunStatus.QUEUED)

    chunker_version: str

    embedding_model: str

    embedding_dim: int = Field(sa_column=Column(SmallInteger, nullable=False))

    is_active: bool = Field(default=False)

    started_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )

    completed_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )

    error_message: str | None = Field(default=None)
