from enum import Enum
from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class ChatRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"

class Conversation(SQLModel, table=True):
    id: UUID | None = Field(default_factory=uuid4, primary_key=True)
    course_id: UUID | None = Field(default=None, foreign_key="course.id")
    title: str
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True)),
        default_factory=lambda: datetime.now(timezone.utc)
    )


class Message(SQLModel, table=True):
    id: UUID | None = Field(default_factory=uuid4, primary_key=True)
    conversation_id: UUID | None = Field(default=None, foreign_key="conversation.id")
    role: ChatRole
    content: str
    citations: list[dict[str, Any]] | None = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True)
    )
    mentioned_file_ids: list[UUID] | None = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True)
    )
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True)),
        default_factory=lambda: datetime.now(timezone.utc)
    )