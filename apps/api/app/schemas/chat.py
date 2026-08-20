from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class ChatRole(Enum):
    USER = "user"
    ASSISTANT = "assistant"


class Conversation(SQLModel, table=True):
    """One conversation, one home course. Decision 1 (18 Aug), option A.

    Ownership derives through `course -> user`. The `user_id` column that used
    to sit here was never ratified -- finding R1, closed 16 Aug -- and the
    `conversationcourselink` junction table went with it. Multi-course already
    exists one level down, on `Message.scope_course_id` plus
    `mentioned_file_ids`; the junction was a second mechanism for the same job.
    """

    id: UUID | None = Field(default_factory=uuid4, primary_key=True)
    course_id: UUID = Field(foreign_key="course.id", ondelete="CASCADE", index=True)
    title: str
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        default_factory=lambda: datetime.now(UTC),
    )
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        default_factory=lambda: datetime.now(UTC),
    )


class Message(SQLModel, table=True):
    """One turn. The three columns below arrived with CR-24 and Decision 2."""

    id: UUID | None = Field(default_factory=uuid4, primary_key=True)
    conversation_id: UUID = Field(foreign_key="conversation.id", ondelete="CASCADE")
    scope_course_id: UUID = Field(
        foreign_key="course.id",
        ondelete="RESTRICT",
        description="The retrieval scope of THIS turn, not the conversation's home course. "
        "RESTRICT rather than CASCADE: finding R3 demonstrated that CASCADE removes "
        "individual turns from the middle of a conversation, leaving a transcript that "
        "no longer reads.",
    )
    role: ChatRole
    content: str
    grounded: bool = Field(
        default=False,
        description="Every claim in this turn is backed by a cited source. A column rather "
        "than something parsed back out of the reply text.",
    )
    citations: list[dict[str, Any]] | None = Field(
        default=None, sa_column=Column(JSONB, nullable=True)
    )
    mentioned_file_ids: list[UUID] | None = Field(
        default=None, sa_column=Column(JSONB, nullable=True)
    )
    scope_snapshot: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True),
        description="What retrieval was allowed to see for this turn, and what it actually "
        "used, frozen at write time. Holds the serialised form of `ScopeSnapshot` in "
        "schemas/rag.py -- including the chunk ids, which is where finding R14's "
        "chunk-level provenance lives rather than in `citations`.",
    )
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        default_factory=lambda: datetime.now(UTC),
    )


class MessageRead(SQLModel):
    id: UUID
    conversation_id: UUID
    scope_course_id: UUID
    role: ChatRole
    content: str
    grounded: bool
    citations: list[dict[str, Any]] | None
    mentioned_file_ids: list[UUID] | None
    created_at: datetime


class ConversationDetail(SQLModel):
    id: UUID
    course_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageRead] = []
