from uuid import uuid4, UUID
from typing import Optional

from sqlalchemy import Column
from sqlmodel import SQLModel, Field, DateTime
from datetime import datetime, timezone


class Course(SQLModel, table=True):
    id: Optional[UUID] = Field(primary_key=True, default_factory=uuid4)
    user: UUID = Field(default=None, foreign_key="user.id")
    code: str
    name: str
    year: int
    sem: int
    status: str
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True)),
        default_factory=lambda: datetime.now(timezone.utc)
    )
