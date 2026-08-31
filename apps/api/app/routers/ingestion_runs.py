from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.schemas.course import Course
from app.schemas.file import File
from app.schemas.folder import Folder
from app.schemas.ingestion_run import IngestionRun, IngestionRunRead


ingestion_runs_router = APIRouter()


# 它告诉 FastAPI：收到符合这个路径的 HTTP GET 请求时，请调用 get_ingestion_run()。
@ingestion_runs_router.get(
    "/{ingestion_run_id}",
    response_model=IngestionRunRead,
)
async def get_ingestion_run(  # 拿某一次文件处理任务的状态/记录
    ingestion_run_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> IngestionRunRead:

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
        select(IngestionRun)
        .join(File, col(IngestionRun.file_id) == col(File.id))
        .join(Folder, col(File.folder_id) == col(Folder.id))
        .join(Course, col(Folder.course_id) == col(Course.id))
    ).where(col(IngestionRun.id) == ingestion_run_id, col(Course.user_id) == user_id)

    result = await session.execute(statement)
    ingestion_run = result.scalar_one_or_none()

    if ingestion_run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INGESTION_RUN_NOT_FOUND", "message": "Ingestion run not found"},
        )
    return IngestionRunRead.model_validate(ingestion_run)
