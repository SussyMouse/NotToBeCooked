from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, UniqueConstraint
from sqlmodel import DateTime, Field, SQLModel


class FolderCreate(SQLModel):
    name: str
    parent_folder_id: UUID | None = None
    sort_order: int = 0


class FolderRead(SQLModel):
    id: UUID
    course_id: UUID
    parent_folder_id: UUID | None
    name: str
    is_root: bool
    sort_order: int
    created_at: datetime
    


class Folder(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("id", "course_id", name="uq_folder_id_course"),)

    id: UUID | None = Field(default_factory=uuid4, primary_key=True)

    # R20. PostgreSQL does not index a foreign key for you. Listing a course's
    # folders is the file explorer's first query on every page load.
    course_id: UUID = Field(foreign_key="course.id", ondelete="CASCADE", index=True)

    # R20. Same reason, and this one is walked recursively -- once per level of
    # nesting, not once per request.
    parent_folder_id: UUID | None = Field(
        default=None, foreign_key="folder.id", ondelete="CASCADE", index=True
    )

    name: str

    is_root: bool

    sort_order: int

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        default_factory=lambda: datetime.now(UTC),
    )
