from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlmodel import DateTime, Field, SQLModel


class Course(SQLModel, table=True):
    id: UUID | None = Field(primary_key=True, default_factory=uuid4)
    user_id: UUID = Field(default=None, foreign_key="user.id")
    code: str
    name: str
    year: int
    sem: int
    status: str
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True)), default_factory=lambda: datetime.now(UTC)
    )
