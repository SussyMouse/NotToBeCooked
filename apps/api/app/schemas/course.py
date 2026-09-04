from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlmodel import DateTime, Field, SQLModel

from app.schemas.file import _enum_values


class CourseStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class CourseCreate(SQLModel):
    code: str
    name: str
    year: int
    sem: int


class CourseUpdate(SQLModel):
    code: str | None = None
    name: str | None = None
    year: int | None = None
    sem: int | None = None
    status: CourseStatus | None = None


class CourseRead(SQLModel):
    id: UUID
    code: str
    name: str
    year: int
    sem: int
    status: CourseStatus
    created_at: datetime


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
    status: CourseStatus = Field(
        default=CourseStatus.ACTIVE,
        sa_column=Column(
            SAEnum(CourseStatus, values_callable=_enum_values, name="coursestatus"),
            nullable=False,
        ),
    )
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        default_factory=lambda: datetime.now(UTC),
    )
