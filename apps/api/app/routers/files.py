from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, update
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.schemas.chunk import Chunk
from app.schemas.course import Course
from app.schemas.file import File as FileRow
from app.schemas.file import FileRead, FileStatus, IngestionResponse
from app.schemas.folder import Folder
from app.schemas.ingestion_run import IngestionRun, IngestionRunStatus
from app.services.processing import NoExtractableContentError, run_ingestion
from app.services.storage import (
    UploadTooLargeError,
    build_storage_key,
    resolve,
    write_upload,
)

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
    status_code=status.HTTP_200_OK,
)
async def ingest_file(
    file_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> IngestionResponse:
    user_id = UUID(user["sub"])

    # Ownership is checked by the join, not by a separate lookup. FILE.course_id
    # exists and would be one hop shorter, but the composite FK only guarantees it
    # agrees with the folder -- it says nothing about who owns the course. Walking
    # FILE -> FOLDER -> COURSE reaches the one column that does: COURSE.user_id.
    #
    # A file owned by someone else therefore falls out of the same query as a file
    # that does not exist, and both leave below as 404. That is deliberate: a 403
    # here would confirm the id is real, which is exactly what a stranger probing
    # ids is trying to learn.
    statement = (
        select(FileRow)
        .join(Folder, col(Folder.id) == col(FileRow.folder_id))
        .join(Course, col(Course.id) == col(Folder.course_id))
        .where(FileRow.id == file_id, Course.user_id == user_id)
    )
    file_row = (await session.exec(statement)).first()
    if file_row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")

    # The run is recorded before any work starts, so a crash mid-ingest leaves a
    # row saying what was attempted rather than nothing at all. The three settings
    # are copied in rather than read back later: they are what THIS run used, and
    # re-indexing under a new chunker or a new embedding model must not silently
    # rewrite the history of the old one.
    #
    # is_active stays False here. R19 (ck_ingestion_run_active_is_ready) is
    # `NOT is_active OR status = 'ready'`, so an active run that is still QUEUED is
    # rejected by the database on insert.
    run = IngestionRun(
        file_id=file_id,
        status=IngestionRunStatus.QUEUED,
        chunker_version=settings.CHUNKER_VERSION,
        embedding_model=settings.MODEL_TYPE,
        embedding_dim=settings.EMBEDDINGS_DIM,
        is_active=False,
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)
    # refresh() has just repopulated the row, so id is set; the annotation is
    # UUID | None only because SQLModel lets the database default it.
    assert run.id is not None

    # storage_key is an object-store key, not a path -- resolve() is the one place
    # that knows how a key maps onto the filesystem today, and the only line that
    # has to change when that becomes a bucket.
    try:
        await run_ingestion(
            file_id=file_id,
            course_id=file_row.course_id,
            ingestion_run_id=run.id,
            file_path=str(resolve(file_row.storage_key)),
            session=session,
        )
    except NoExtractableContentError:
        # run_ingestion has already marked the INGESTION_RUN row failed. This marks
        # the FILE row, which nothing else touches -- without it a scanned PDF sits
        # at `uploaded` forever and the UI has no way to say why.
        file_row.status = FileStatus.FAILED
        await session.commit()
        return IngestionResponse(
            file_id=file_id, status="failed", chunk_count=0,
            error="This PDF has no selectable text (usually a scan or images only).",
        )

    # Deactivate before activate, never the other way round.
    # ix_ingestion_run_one_active is a partial UNIQUE on file_id WHERE is_active, so
    # the two runs must not both be active for even one statement. Setting
    # run.is_active first does not merely read wrong -- session.exec() autoflushes
    # the pending change ahead of the UPDATE, so the collision happens before the
    # statement that would have resolved it is ever sent.
    await session.exec(
        update(IngestionRun)
        .where(col(IngestionRun.file_id) == file_id, col(IngestionRun.is_active))
        .values(is_active=False)
    )
    run.is_active = True

    file_row.status = FileStatus.READY
    file_row.indexed_at = datetime.now(UTC)
    await session.commit()

    # Counted by ingestion_run_id, not file_id. Nothing in the codebase deletes
    # chunks, so a file ingested three times has three generations of rows and
    # file_id would report their sum -- a number that only ever grows.
    chunk_count = (await session.exec(
        select(func.count()).select_from(Chunk).where(Chunk.ingestion_run_id == run.id)
    )).one()

    return IngestionResponse(
        file_id=file_id, status="ready", chunk_count=chunk_count, error=None,
    )