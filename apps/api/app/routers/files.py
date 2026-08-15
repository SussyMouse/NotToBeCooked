from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.dependencies.auth import get_current_user
from app.schemas.file import IngestionResponse

files_router = APIRouter(dependencies=[Depends(get_current_user)])


@files_router.post(
    "/{file_id}/ingest",
    response_model=IngestionResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def ingest_file(file_id: UUID) -> IngestionResponse:
    return IngestionResponse(
        file_id=file_id,
        status="processing",
        chunk_count=None,
        error=None,
    )
