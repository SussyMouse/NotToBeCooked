from app.schemas.file import File
from app.schemas.rag import Chunk, RetrievedChunk

from uuid import UUID
from sqlmodel import select, col
from sqlmodel.ext.asyncio.session import AsyncSession


# Document ingestions
async def add_chunks(chunks: list[Chunk], session: AsyncSession):
    pass

async def delete_chunk_by_file_id(file_id: UUID,  session: AsyncSession):
    pass

# Retrieval and search operations
async def vector_search(
    query_vector: list[float],
    session: AsyncSession,
    file_ids: list[UUID] | None = None,
    top_k: int = 5
) -> list[RetrievedChunk]:
    """Performs cosine similarity search over chunk embeddings.
    Returns the top-k most similar chunks ranked by cosine distance (ascending).
    Each result is mapped to a RetrievedChunk with score = 1 - cosine_distance.
    Args:
        query_vector: The embedding of the user's query.
        session:      An async SQLAlchemy session.
        file_ids:     Optional list of file UUIDs to restrict the search scope.
        top_k:        Maximum number of chunks to return.
    Returns:
        A list of RetrievedChunk objects ordered by descending similarity.
    """

    distance_col = Chunk.embedding.cosine_distance(query_vector).label("distance")
    statement = (select(Chunk, File, distance_col)
        .join(File)
        .where(File.id == Chunk.file_id)
        .order_by(distance_col)
    )
    if file_ids:
        statement = statement.where(col(Chunk.file_id).in_(file_ids))
    statement = statement.limit(top_k)
    result = await session.exec(statement)
    rows = result.all()

    retrieved_chunks: list[RetrievedChunk] = []
    for chunk, file, distance in rows:
        file_statement = select(File).where(File.id == chunk.file_id)
        file_result = await session.exec(file_statement)
        file = file_result.one()

        retrieved_chunk = RetrievedChunk(
            chunk_id=chunk.id,
            file_id=chunk.file_id,
            course_id=file.course_id,
            filename=file.filename,
            page_number=chunk.page_number,
            page_end=chunk.page_end,
            heading=chunk.heading,
            content=chunk.content,
            score=float(1.0 - distance)
        )
        retrieved_chunks.append(retrieved_chunk)

    return retrieved_chunks

async def hybrid_search():
    pass