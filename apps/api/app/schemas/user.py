from datetime import UTC, datetime
from uuid import UUID, uuid4

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Column, Field, SQLModel


class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True)
    display_name: str | None = None


class User(UserBase, table=True):
    id: UUID | None = Field(default_factory=uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_column=Column(DateTime(timezone=True)),
    )


class UserRead(UserBase):
    id: UUID
    created_at: datetime


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

