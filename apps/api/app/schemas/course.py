from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, UniqueConstraint
from sqlmodel import DateTime, Field, SQLModel


class Course(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "code",
            "year",
            "sem",
            name="uq_course_user_code_year_sem",
        ),
    )
    id: UUID | None = Field(primary_key=True, default_factory=uuid4)
    user_id: UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    code: str
    name: str
    year: int
    sem: int
    status: str
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        default_factory=lambda: datetime.now(UTC),
    )
