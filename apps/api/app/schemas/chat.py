from app.schemas.course import Course

from enum import Enum
from typing import Any
from uuid import UUID, uuid4
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel, Relationship


class ChatRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"

class ConversationCourseLink(SQLModel, table=True):
    conversation_id: UUID = Field(default=None, foreign_key="conversation.id", primary_key=True)
    course_id: UUID = Field(default=None, foreign_key="course.id", primary_key=True)

class Conversation(SQLModel, table=True):
    id: UUID | None = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(default=None, foreign_key="user.id", index=True)
    title: str
    courses: list["Course"] = Relationship(link_model=ConversationCourseLink)
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True)),
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
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

class MessageRead(SQLModel):
    id: UUID
    conversation_id: UUID
    role: ChatRole
    content: str
    citations: list[dict[str, Any]] | None
    mentioned_file_ids: list[UUID] | None
    created_at: datetime

class ConversationDetail(SQLModel):
    id: UUID
    user_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageRead] = []

