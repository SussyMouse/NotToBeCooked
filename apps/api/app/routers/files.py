from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from app.core.config import settings
from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.schemas.course import Course
from app.schemas.file import File, IngestionResponse
from app.schemas.folder import Folder
from app.schemas.ingestion_run import IngestionRun

files_router = APIRouter()


@files_router.post(
    "/{file_id}/ingest",
    response_model=IngestionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_file(
    file_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> IngestionResponse:

    user_id = user.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_TOKEN",
                "message": "Invalid or tampered token",
            },
        )
    statement = (
        select(File)
        .join(Folder, col(File.folder_id) == col(Folder.id))
        .join(Course, col(Folder.course_id) == col(Course.id))
        .where((col(File.id) == file_id), (col(Course.user_id) == user_id))
    )

    result = await session.execute(statement)
    file_record = result.scalar_one_or_none()

    if file_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "FILE_NOT_FOUND", "message": "File not found"},
        )

    ingestion_run = IngestionRun(
        file_id=file_id,
        chunker_version="v1",
        embedding_model=settings.MODEL_TYPE,
        embedding_dim=settings.EMBEDDINGS_DIM,
    )

    session.add(ingestion_run)
    await session.commit()
    await session.refresh(ingestion_run)

    ingestion_run_id = ingestion_run.id
    if ingestion_run_id is None:
        raise RuntimeError("Ingestion run ID was not generated")

    return IngestionResponse(
        file_id=file_id,
        ingestion_run_id=ingestion_run_id,
        status="queued",
        chunk_count=None,
        error=None,
    )
