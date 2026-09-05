from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.schemas.course import Course
from app.schemas.file import File as FileRow
from app.schemas.folder import Folder, FolderCreate, FolderRead, FolderUpdate

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


@folders_router.get(
    "/{course_id}/folders/{folder_id}", response_model=FolderRead, status_code=status.HTTP_200_OK
)
async def get_folder(
    course_id: UUID,
    folder_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> FolderRead:
    user_id = UUID(user["sub"])

    statement = (
        select(Folder)
        .join(Course, (col(Folder.course_id) == col(Course.id)))
        .where(
            (col(Course.id) == course_id),
            (col(Folder.id) == folder_id),
            (col(Folder.course_id) == course_id),
            (col(Course.user_id) == user_id),
        )
    )

    result = await session.exec(statement)
    folder = result.first()
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    return FolderRead.model_validate(folder)


@folders_router.patch(
    "/{course_id}/folders/{folder_id}",
    response_model=FolderRead,
)
async def update_folder(
    course_id: UUID,
    folder_id: UUID,
    data: FolderUpdate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> FolderRead:
    user_id = UUID(user["sub"])

    statement = (
        select(Folder)
        .join(
            Course,
            (col(Folder.course_id) == col(Course.id)),
        )
        .where(
            col(Course.id) == course_id,
            col(Folder.id) == folder_id,
            col(Course.user_id) == user_id,
        )
    )
    result = await session.exec(statement)
    folder = result.first()
    if folder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    if data.name is not None:
        folder.name = data.name
    if data.sort_order is not None:
        folder.sort_order = data.sort_order

    await session.commit()
    await session.refresh(folder)
    return FolderRead.model_validate(folder)


@folders_router.delete(
    "/{course_id}/folders/{folder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_folder(
    course_id: UUID,
    folder_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> None:
    user_id = UUID(user["sub"])
    statement = (
        select(Folder)
        .join(
            Course,
            (col(Folder.course_id) == col(Course.id)),
        )
        .where(
            col(Course.id) == course_id,
            col(Folder.id) == folder_id,
            col(Course.user_id) == user_id,
        )
    )
    result = await session.exec(statement)
    folder = result.first()

    if folder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found",
        )

    statement2 = select(Folder).where(
        col(Folder.parent_folder_id) == folder_id,
        col(Folder.course_id) == course_id,
    )
    child_result = await session.exec(statement2)
    child_folder = child_result.first()
    if child_folder is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Folder is not empty",
        )

    statement3 = select(FileRow).where(
        col(FileRow.folder_id) == folder_id,
        col(FileRow.course_id) == course_id,
    )
    file_result = await session.exec(statement3)
    contained_file = file_result.first()
    if contained_file is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Folder is not empty",
        )

    await session.delete(folder)
    await session.commit()
    return None
