import asyncio

from app.schemas.file import File
from app.schemas.rag import Chunk, RetrievedChunk

from collections.abc import Sequence
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func
from sqlmodel import select, col, delete
from sqlmodel.ext.asyncio.session import AsyncSession


@dataclass
class SearchConfig:
    """Configuration for hybrid search behavior."""
    keyword_weight: float = 1.0    # Weight for keyword results in RRF
    vector_weight: float = 1.0     # Weight for vector results in RRF
    rrf_k: int = 60                # RRF constant
    keyword_limit: int = 50        # Max results from keyword search
    vector_limit: int = 50         # Max results from vector search
    final_limit: int = 20          # Max results to return
    min_score_threshold: float = 0.0  # Minimum RRF score to include


# Document ingestions
async def add_chunks(chunks: list[Chunk], session: AsyncSession) -> None:
    """Adds a list of chunks to the session and flushes."""
    session.add_all(chunks)
    await session.flush()

async def delete_chunks_by_file_id(file_id: UUID, session: AsyncSession) -> int:
    """Deletes all chunks associated with a file ID.
    Args:
        file_id: File ID whose chunks should be deleted.
        session: An async SQLAlchemy session.
    Returns:
        The number of deleted chunks.
    """
    statement = delete(Chunk).where(Chunk.file_id == file_id)
    result = await session.exec(statement)
    await session.flush()
    return result.rowcount if result.rowcount is not None else 0

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
) -> Sequence[tuple[Chunk, float]]:
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

async def keyword_search(
    keyword: str,
    session: AsyncSession,
    file_ids: list[UUID] | None = None,
    top_k: int = 5
) -> Sequence[tuple[Chunk, float]]:
    return await _full_text_search(
        keyword,
        session,
        file_ids,
        top_k
    )

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

"""Hybrid search design decision.
Currently uses RRF, but may use Reranker for higher accuracy which uses GPU.
In the future, may make RRF as Stage 1 while Reranker as Stage 2 or completely
replace RRF as Reranker.

RRF is used currently as a learning project. In the future, may document its
accuracy eval improves when switched to Reranker.
"""
async def hybrid_search(
    query_text: str,
    query_vector: list[float],
    session: AsyncSession,
    file_ids: list[UUID],
    config: SearchConfig = SearchConfig()
) -> list[RetrievedChunk]:
    """Performs Hybrid Search using weighted Reciprocal Rank Fusion (RRF).
    1. Executes Vector Search and Full-Text Keyword Search concurrently in parallel.
    2. Fuses the ranks using weighted RRF: score = w * (1 / (k + rank)).
    3. Sorts, filters by threshold, and returns the top final_limit items.
    """
    # 1: concurrent execution of vector and keyword searchs
    vector_task = _vector_similarity_search(
        query_vector, session, file_ids, top_k=config.vector_limit
    )
    keyword_task = _full_text_search(
        query_text, session, file_ids, top_k=config.keyword_limit
    )
    vector_row, keyword_row = await asyncio.gather(vector_task, keyword_task)

    # 2: perform RRF
    rrf_scores: dict[UUID, float] = {}
    chunk_map: dict[UUID, tuple[Chunk, File]] = {}
    for rank, (chunk, file, distance) in enumerate(vector_row, start=1):
        chunk_id = chunk.id
        scores = config.vector_weight * (1 / config.rrf_k + rank)
        rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0) + scores
        chunk_map[chunk_id] = (chunk, file)

    for rank, (chunk, rank) in enumerate(keyword_row, start=1):
        chunk_id = chunk.id
        scores = config.keyword_weight * (1 / config.rrf_k + rank)
        rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0) + scores

    # 3: sort in descending order
    sorted_candidates = sorted(
        rrf_scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    # 4: filter by threshold, shorten to final_limits and map to RetrievedChunk
    retrieved_chunks: list[RetrievedChunk] = []
    for id, score in sorted_candidates:
        if len(retrieved_chunks) >= config.final_limit:
            break
        elif score < config.min_score_threshold:
            continue

        file = chunk_map[id][1]
        chunk = chunk_map[id][0]
        retrieved_chunks.append(
            RetrievedChunk(
                chunk_id=id,
                file_id=chunk.file_id,
                course_id=file.course_id,
                filename=file.filename,
                page_number=chunk.page_number,
                page_end=chunk.page_end,
                heading=chunk.heading,
                content=chunk.content,
                score=score
            )
        )
    return retrieved_chunks
