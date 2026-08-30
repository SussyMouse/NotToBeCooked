from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, Column, DateTime, ForeignKeyConstraint, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlmodel import Field, SQLModel


def _enum_values(enum_cls: type[Enum]) -> list[str]:
    """Render a PostgreSQL enum from member values, not member names."""
    return [m.value for m in enum_cls]


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

    __table_args__ = (
        UniqueConstraint("id", "course_id", name="uq_file_id_course"),

        ForeignKeyConstraint(
            ["folder_id", "course_id"],
            ["folder.id", "folder.course_id"],
            ondelete="CASCADE",
            name="fk_file_folder_course_agree",
        ),

    )

    id: UUID | None = Field(primary_key=True, default_factory=uuid4)
    # Denormalised from FOLDER, restored 25 Aug 2026 by Decision 02 option B.
    #
    # The history is worth keeping straight, because this column has now been here
    # twice. It existed until 20 Aug as a plain shortcut; it was removed when
    # FOLDER arrived, on the grounds that a file's course is derivable through its
    # folder and one join is cheap. The 25 Aug meeting put it back for a different
    # reason, and that reason is not convenience.
    #
    # R4's second half needs CHUNK.course_id to agree with CHUNK.file_id, and a
    # composite foreign key must point at real columns on one table. No column
    # anywhere carried both `file_id` and `course_id`, so there was nothing for
    # CHUNK to point at. This column is that target. The chain is:
    #
    #     CHUNK (file_id, course_id)   -> FILE   (id, course_id)
    #     FILE  (folder_id, course_id) -> FOLDER (id, course_id)
    #
    # So the value here is not free to be whatever the caller passes. The second
    # link above is the composite FK in __table_args__: a file claiming a course
    # its folder does not belong to is rejected by the database, not by a comment.
    course_id: UUID = Field(foreign_key="course.id", ondelete="CASCADE", index=True)
    folder_id: UUID = Field(foreign_key="folder.id", ondelete="CASCADE", index=True)
    filename: str
    storage_key: str = Field(
        unique=True,
        description="Object-store key, not a filesystem path. UNIQUE because two rows must "
        "not claim the same stored object.",
    )
    sha256: str | None = Field(
        default=None,
        # R20. Indexed, non-unique. Its job is "has this account uploaded this
        # content already" -- a lookup, not a rule. R7 is why it must not be
        # unique: a global UNIQUE would reject the second student to upload the
        # same lecture slides.
        index=True,
        description="Content checksum. Deliberately NOT unique -- finding R7: a global "
        "UNIQUE would reject the second student to upload the same lecture slides.",
    )
    mime_type: str
    size_bytes: int = Field(sa_column=Column(BigInteger, nullable=False))
    page_count: int | None = None
    # values_callable, because SQLAlchemy names a PostgreSQL enum's members after the
    # Python member NAMES by default -- 'READY', not 'ready'. The ERD, the API contract
    # (FileRead's Literal) and the JSON on the wire all say lowercase, so without this the
    # database is the one place holding a different spelling. Nothing breaks through the
    # ORM, which maps both ways silently; what breaks is every hand-written query, and
    # R19's CHECK (is_active implies status = 'ready') would simply never be true.
    # Free to fix now, an ALTER TYPE once there is data.
    status: FileStatus = Field(
        default=FileStatus.UPLOADED,
        sa_column=Column(
            SAEnum(FileStatus, values_callable=_enum_values, name="filestatus"),
            nullable=False,
        ),
    )
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
    folder_id: UUID
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
