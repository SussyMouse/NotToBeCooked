from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from pydantic import EmailStr
from sqlmodel import Field, SQLModel


class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True)
    display_name: Optional[str] = None


class User(UserBase, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserRead(UserBase):
    id: UUID
    created_at: datetime


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

