from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlmodel import DateTime, Field, SQLModel


class Folder(SQLModel, table=True):
    id: UUID | None = Field(default_factory=uuid4, primary_key=True)

    course_id: UUID = Field(foreign_key="course.id")

    parent_folder_id: UUID | None = Field(default=None, foreign_key="folder.id")

    name: str

    is_root: bool

    sort_order: int

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True)), default_factory=lambda: datetime.now(UTC)
    )
