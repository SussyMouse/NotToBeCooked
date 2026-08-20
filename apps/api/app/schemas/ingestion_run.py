from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, SmallInteger
from sqlalchemy import Enum as SAEnum
from sqlmodel import DateTime, Field, SQLModel

from app.schemas.file import _enum_values


class IngestionRunStatus(StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class IngestionRun(SQLModel, table=True):
    # SQLModel declares __tablename__ as a descriptor, so assigning a plain string
    # to it is an inconsistent override and every type checker says so in its own
    # words. It cannot be dropped: SQLModel would default to "ingestionrun", and
    # CHUNK's foreign key targets "ingestion_run.id". Rewriting it as a
    # declared_attr was tried and is worse -- pyright then reports two errors
    # instead of one and pyrefly still reports the override.
    #
    # Two named suppressions rather than a bare `# type: ignore`, so a genuinely
    # new error on this line still surfaces.
    __tablename__ = "ingestion_run"  # pyrefly: ignore[bad-override]  # pyright: ignore[reportAssignmentType]

    id: UUID | None = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    file_id: UUID = Field(foreign_key="file.id", ondelete="CASCADE")

    # values_callable — see the same note on FileStatus in schemas/file.py.
    # Without it PostgreSQL stores 'QUEUED' while the ERD, the API and every
    # hand-written query say 'queued'. R19 (is_active implies status = 'ready')
    # attaches to this column, and would never be true.
    status: IngestionRunStatus = Field(
        default=IngestionRunStatus.QUEUED,
        sa_column=Column(
            SAEnum(IngestionRunStatus, values_callable=_enum_values, name="ingestionrunstatus"),
            nullable=False,
        ),
    )

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
