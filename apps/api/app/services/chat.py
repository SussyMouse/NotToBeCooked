from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from app.schemas.chat import Conversation
from app.schemas.course import Course, CourseStatus


async def get_or_create_conversation(
    session: AsyncSession,
    user_id: UUID | str,
    course_id: UUID | None,
    conversation_id: UUID | None,
    title: str | None = None,
) -> Conversation:
    """Gets an existing conversation or creates a new one.
    TODO: remove course auto-correction. this is intended only for development

    - If conversation_id is provided: verifies ownership via Course -> User and returns it.
      If stale/not found, falls back gracefully to creating a new conversation under the course.
    - If course_id is provided: verifies or ensures course existence for user and creates a new Conversation.
    - If neither is provided: uses the user's primary/unsorted course to create a Conversation.
    """
    uid = UUID(user_id) if not isinstance(user_id, UUID) else user_id

    if conversation_id:
        statement = (
            select(Conversation)
            .join(Course, col(Conversation.course_id) == col(Course.id))
            .where(
                col(Course.user_id) == uid,
                col(Conversation.id) == conversation_id,
            )
        )
        result = await session.execute(statement)
        conversation = result.scalar_one_or_none()

        if conversation:
            return conversation

    # TODO: remove course auto-correction. this is intended only for development
    # Determine or ensure valid Course record in database
    target_course: Course | None = None  # 
    if course_id:
        statement = (
            select(Course)
            .where(col(Course.user_id) == uid)
            .where(col(Course.id) == course_id)
        )
        result = await session.execute(statement)
        target_course = result.scalar_one_or_none()

    if not target_course and course_id:
        # Create the course record if it does not yet exist in PostgreSQL
        target_course = Course(
            id=course_id,
            user_id=uid,
            code="COURSE",
            name="Course Workspace",
            year=1,
            sem=1,
            status=CourseStatus.ACTIVE,
        )
        session.add(target_course)
        await session.flush()
    elif not target_course:
        # Fallback: check if the user has an existing course (e.g., UNSORTED)
        statement = select(Course).where(col(Course.user_id) == uid)
        result = await session.execute(statement)
        target_course = result.scalars().first()

        if not target_course:
            target_course = Course(
                id=uuid4(),
                user_id=uid,
                code="UNSORTED",
                name="Unsorted",
                year=0,
                sem=0,
                status=CourseStatus.ACTIVE,
            )
            session.add(target_course)
            await session.flush()

    assert target_course.id is not None
    new_conversation = Conversation(
        id=uuid4(),
        course_id=target_course.id,
        title=title or "New Conversation",
    )
    session.add(new_conversation)
    await session.commit()
    await session.refresh(new_conversation)
    return new_conversation
