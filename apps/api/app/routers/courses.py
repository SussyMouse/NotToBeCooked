from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.schemas.course import Course, CourseCreate, CourseRead, CourseStatus, CourseUpdate

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

    statement = select(Course).where(
        col(Course.user_id) == user_id,
        col(Course.status) == CourseStatus.ACTIVE,
    )
    result = await session.exec(statement)
    courses = result.all()
    return [CourseRead.model_validate(course) for course in courses]


@courses_router.patch(
    "/{course_id}",
    response_model=CourseRead,
)
async def update_course(
    course_id: UUID,
    data: CourseUpdate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> CourseRead:

    user_id = UUID(user["sub"])
    statement = select(Course).where(col(Course.user_id) == user_id, col(Course.id) == course_id)

    course = (await session.exec(statement)).first()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    if data.code is not None:
        course.code = data.code
    if data.name is not None:
        course.name = data.name
    if data.year is not None:
        course.year = data.year
    if data.sem is not None:
        course.sem = data.sem
    if data.status is not None:
        course.status = data.status

    await session.commit()
    await session.refresh(course)
    return CourseRead.model_validate(course)


@courses_router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_course(
    course_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> None:

    user_id = UUID(user["sub"])
    statement = select(Course).where(
        col(Course.user_id) == user_id,
        col(Course.id) == course_id,
    )
    course = (await session.exec(statement)).first()

    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course.status = CourseStatus.ARCHIVED

    await session.commit()
