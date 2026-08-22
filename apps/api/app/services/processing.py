from uuid import UUID

from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.vector_ops import add_chunks
from app.schemas.chunk import Chunk
from app.services.embeddings import embed_text
from app.services.ingestion import create_chunk, extract_text, ingest_document


async def process_file(
    file_id: UUID,
    course_id: UUID,
    ingestion_run_id: UUID,
    file_path: str,
    session: AsyncSession,
):
    document = ingest_document(file_path)
    extracted_items = extract_text(document)
    chunk_creates = create_chunk(extracted_items, file_id)

    content_list = []  # list that save content inside chunk object
    for chunk in chunk_creates:
        content_list.append(chunk.content)

    embeddings = embed_text(content_list)  # list of embedding

    database_chunks = []
    for chunk_create, embedding in zip(chunk_creates, embeddings, strict=True):
        database_chunk = Chunk(
            file_id=chunk_create.file_id,
            course_id=course_id,
            ingestion_run_id=ingestion_run_id,
            chunk_index=chunk_create.chunk_index,
            page_start=chunk_create.page_start,
            page_end=chunk_create.page_end,
            heading=chunk_create.heading,
            content=chunk_create.content,
            token_count=chunk_create.token_count,
            embedding=embedding,
        )
        database_chunks.append(database_chunk)

    await add_chunks(database_chunks, session)
