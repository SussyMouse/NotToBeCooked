from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.schemas.course import Course
from app.schemas.file import File as FileRow
from app.schemas.file import FileRead, FileStatus, IngestionResponse
from app.schemas.folder import Folder
from app.services.storage import UploadTooLargeError, build_storage_key, write_upload

files_router = APIRouter(dependencies=[Depends(get_current_user)])


@files_router.post(
    "",
    response_model=FileRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_file(
    folder_id: UUID = Form(...),
    upload: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> FileRow:
    """Store an uploaded file and record it. Does not index it.

    Upload and ingestion are two endpoints on purpose, which is why `uploaded`
    exists as a FileStatus value (restored 18 Aug). This one returns as soon as
    the bytes are safe; `POST /files/{file_id}/ingest` is what turns them into
    chunks.

    `course_id` is read from the folder, never from the request. The client
    could send one, and a client that sends the wrong one would be writing a row
    that r42's composite foreign key rejects -- so the correct value is already
    known server-side, and asking for it only creates a way to be wrong.
    """
    user_id = UUID(user["sub"])

    # One query answers both "does this folder exist" and "does this caller own
    # it". Splitting them would mean a 404 and a 403 that together tell a
    # stranger which folder ids are real.
    statement = (
        select(Folder)
        .join(Course, Course.id == Folder.course_id)  # pyright: ignore[reportArgumentType]
        .where(Folder.id == folder_id, Course.user_id == user_id)
    )
    folder = (await session.execute(statement)).scalars().first()
    if folder is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")

    filename = upload.filename or "untitled"
    file_id = uuid4()
    storage_key = build_storage_key(user_id, file_id, filename)

    try:
        size_bytes, sha256 = await write_upload(upload, storage_key)
    except UploadTooLargeError as exc:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, str(exc)) from exc

    row = FileRow(
        id=file_id,
        # folder_id rather than folder.id: same value, but the column is declared
        # `UUID | None` on the model, and the form field is not.
        folder_id=folder_id,
        course_id=folder.course_id,
        filename=filename,
        storage_key=storage_key,
        sha256=sha256,
        mime_type=upload.content_type or "application/octet-stream",
        size_bytes=size_bytes,
        status=FileStatus.UPLOADED,
        uploaded_at=datetime.now(UTC),
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


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
