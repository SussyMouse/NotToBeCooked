from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.schemas.course import Course, CourseCreate, CourseRead

courses_router = APIRouter(dependencies=[Depends(get_current_user)])


@courses_router.post(
    "",
    response_model=CourseRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_course(
    data: CourseCreate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> CourseRead:

    user_id = UUID(user["sub"])
    course = Course(
        user_id=user_id,
        code=data.code,
        name=data.name,
        year=data.year,
        sem=data.sem,
    )

    session.add(course)
    await session.commit()
    await session.refresh(course)
    return CourseRead.model_validate(course)


@courses_router.get(
    "",
    response_model=list[CourseRead],
)
async def list_courses(
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> list[CourseRead]:
    user_id = UUID(user["sub"])

    statement = select(Course).where(col(Course.user_id) == user_id)
    result = await session.exec(statement)
    courses = result.all()
    return [CourseRead.model_validate(course) for course in courses]
