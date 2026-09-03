from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.schemas.course import Course
from app.schemas.folder import Folder, FolderCreate, FolderRead

folders_router = APIRouter(dependencies=[Depends(get_current_user)])


@folders_router.post(
    "/{course_id}/folders",
    response_model=FolderRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_folder(
    course_id: UUID,
    data: FolderCreate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> FolderRead:
    user_id = UUID(user["sub"])

    statement = select(Course).where(
        col(Course.id) == course_id,
        col(Course.user_id) == user_id,
    )
    course = (await session.exec(statement)).first()
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )
    if data.parent_folder_id is not None:
        parent_statement = select(Folder).where(
            col(Folder.id) == data.parent_folder_id,
            col(Folder.course_id) == course_id,
        )
        parent_folder = (await session.exec(parent_statement)).first()

        if parent_folder is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Parent folder not found"
            )

    folder = Folder(
        course_id=course_id,
        parent_folder_id=data.parent_folder_id,
        name=data.name,
        is_root=data.parent_folder_id is None,
        sort_order=data.sort_order,
    )

    session.add(folder)
    await session.commit()
    await session.refresh(folder)
    return FolderRead.model_validate(folder)


@folders_router.get(
    "/{course_id}/folders",
    response_model=list[FolderRead],
)
async def list_folders(
    course_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> list[FolderRead]:
    user_id = UUID(user["sub"])

    course_statement = select(Course).where(
        col(Course.id) == course_id,
        col(Course.user_id) == user_id,
    )
    course = (await session.exec(course_statement)).first()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    folder_statement = (
        select(Folder).where(col(Folder.course_id) == course_id).order_by(col(Folder.sort_order))
    )
    result = await session.exec(folder_statement)
    folders = result.all()

    return [FolderRead.model_validate(folder) for folder in folders]
