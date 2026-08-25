from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Column, Index, SmallInteger, UniqueConstraint, text
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

    __table_args__ = (
        # R8. The annotation says exactly one active run per file is visible to
        # retrieval, and a boolean cannot say that -- two rows can both be true.
        # A plain UNIQUE (file_id, is_active) would be worse than nothing: it
        # would also allow only one *inactive* run per file, so a re-index could
        # never keep its predecessor. The WHERE clause is what makes it index
        # only the rows that matter.
        Index(
            "ix_ingestion_run_one_active",
            "file_id",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        # R19. An active run must not be a failed or in-progress one.
        # `NOT is_active OR status = 'ready'` is the SQL way of writing
        # "is_active implies ready": it is false only when is_active is true and
        # status is anything else.
        #
        # 'ready' is lowercase deliberately -- see R25. Until 20 Aug SQLAlchemy
        # rendered this enum from member NAMES, so the database held 'READY' and
        # this CHECK would have been permanently, silently true.
        CheckConstraint(
            "NOT is_active OR status = 'ready'",
            name="ck_ingestion_run_active_is_ready",
        ),
        # R4's other half lives on CHUNK. A composite foreign key needs a unique
        # constraint covering exactly the columns it points at, and `id` alone
        # being unique is not enough for PostgreSQL to accept (id, file_id) as a
        # target. Redundant as a uniqueness claim, required as an FK target.
        UniqueConstraint("id", "file_id", name="uq_ingestion_run_id_file"),
    )

    id: UUID | None = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    # R20. ix_ingestion_run_one_active above is partial, so it only answers
    # queries that also say `is_active`. "every run for this file" needs a plain
    # index of its own.
    file_id: UUID = Field(foreign_key="file.id", ondelete="CASCADE", index=True)

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
