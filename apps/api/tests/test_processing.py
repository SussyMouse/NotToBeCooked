import asyncio
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

from app.schemas.chunk import ChunkCreate
from app.services.processing import process_file


def make_chunk_create(file_id: UUID) -> ChunkCreate:

    test = ChunkCreate(
        file_id=file_id,
        chunk_index=0,
        page_start=1,
        page_end=1,
        heading="testing heading, bao sheng",
        content="testing content, bao sheng",
        token_count=45,
    )
    return test


test_file_id = uuid4()
test_chunk_create = make_chunk_create(test_file_id)


fake_embedding = [0.0] * 1024


async def run_test():

    with patch(
        "app.services.processing.ingest_document",
        return_value="fake_document",
    ) as mock_ingest:
        with patch(
            "app.services.processing.extract_text",
            return_value="fake_extract_text",
        ) as mock_extract:
            with patch(
                "app.services.processing.create_chunk",
                return_value=[test_chunk_create],
            ) as mock_create:
                with patch(
                    "app.services.processing.embed_text",
                    return_value=[fake_embedding],
                ) as mock_embed:
                    with patch(
                        "app.services.processing.add_chunks",
                        new_callable=AsyncMock,
                    ) as mock_add:
                        course_id = uuid4()
                        ingestion_run_id = uuid4()
                        fake_session = AsyncMock()

                        await process_file(
                            file_id=test_file_id,
                            course_id=course_id,
                            ingestion_run_id=ingestion_run_id,
                            file_path="abc.pdf",
                            session=fake_session,
                        )

                        assert mock_ingest.call_count == 1
                        assert mock_extract.call_count == 1
                        assert mock_create.call_count == 1
                        assert mock_embed.call_count == 1
                        assert mock_add.await_count == 1
                        mock_add.assert_awaited_once() #我要求 mock_add 必须刚好被 await 一次

                        assert mock_add.await_args is not None
                        database_chunks, received_session = mock_add.await_args.args

                        database_chunk = database_chunks[0]
                        assert database_chunk.file_id == test_file_id
                        assert database_chunk.course_id == course_id
                        assert database_chunk.ingestion_run_id == ingestion_run_id
                        assert database_chunk.content == test_chunk_create.content
                        assert database_chunk.embedding == fake_embedding
                        assert len(database_chunk.embedding) == 1024
                        assert received_session is fake_session


asyncio.run(run_test())
