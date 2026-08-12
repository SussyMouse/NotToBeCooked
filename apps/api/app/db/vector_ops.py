from collections.abc import Sequence
from app.schemas.file import File
from app.schemas.rag import Chunk, RetrievedChunk

from uuid import UUID
from sqlalchemy import func
from sqlmodel import select, col
from sqlmodel.ext.asyncio.session import AsyncSession


# Document ingestions
async def add_chunks(chunks: list[Chunk], session: AsyncSession):
    pass

async def delete_chunk_by_file_id(file_id: UUID,  session: AsyncSession):
    pass


# Retrieval and search operations
async def _vector_similarity_search(
    query_vector: list[float],
    session: AsyncSession,
    file_ids: list[UUID] | None = None,
    top_k: int = 5
) -> Sequence[tuple[Chunk, File, float]]:
    """Performs
    SELECT chunk, file, chunk.embedding <=> cos(query_vector) AS distance
    FROM chunk, file
    WHERE file.id == chunk.file_id
    WHERE chunk.file_id in file_ids
    ORDER BY distance
    LIMIT 5
    """
    distance_col = Chunk.embedding.cosine_distance(query_vector).label("distance")
    statement = (
        select(Chunk, File, distance_col)
        .join(File)
        .where(File.id == Chunk.file_id)
        .order_by(distance_col)
    )
    if file_ids:
        statement = statement.where(col(Chunk.file_id).in_(file_ids))
    statement = statement.limit(top_k)
    result = await session.exec(statement)

    return result.all()

async def _full_text_search(
    term: str,
    session: AsyncSession,
    file_ids: list[UUID] | None = None,
    top_k: int = 5
):
    """Performs
    SELECT chunk.*, ts_rank(chunk.content_tsv, plainto_tsquery('english', term)) AS rank
    FROM chunk
    WHERE chunk.file_id IN file_ids
    WHERE chunk.content_tsv @@ plainto_tsquery('english', term)
    ORDER BY rank DESC
    LIMIT 5
    """
    ts_query = func.plainto_tsquery("english", term)
    rank_col = func.ts_rank(Chunk.content_tsv, ts_query).label("rank")
    statement = select(Chunk, rank_col)
    if file_ids:
        statement = statement.where(col(Chunk.file_id).in_(file_ids))
    statement = (statement
        .where(Chunk.content_tsv.op("@@")(ts_query))
        .order_by(rank_col.desc())
        .limit(top_k)
    )
    
    result = await session.exec(statement)
    return result.all()

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

    rows = await _vector_similarity_search(
        query_vector,
        session,
        file_ids,
        top_k
    )

    retrieved_chunks: list[RetrievedChunk] = []
    for chunk, file, distance in rows:
        retrieved_chunk = RetrievedChunk(
            chunk_id=chunk.id,
            file_id=chunk.file_id,
            course_id=file.course_id,
            filename=file.filename,
            page_number=chunk.page_number,
            page_end=chunk.page_end,
            heading=chunk.heading,
            content=chunk.content,
            score=1.0 - distance
        )
        retrieved_chunks.append(retrieved_chunk)

    return retrieved_chunks

async def hybrid_search():
    pass


if __name__ == "__main__":
    print(File)