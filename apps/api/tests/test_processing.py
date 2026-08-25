
from uuid import uuid4,UUID
from unittest.mock import AsyncMock,patch
import asyncio


from app.schemas.chunk import ChunkCreate
from app.services.processing import process_file


def make_chunk_create(file_id: UUID) -> ChunkCreate:

    test=ChunkCreate(
        file_id=file_id,
        chunk_index=0,
        page_start=1,
        page_end=1,
        heading="testing heading, bao sheng",
        content="testing content, bao sheng",
        token_count=45,
    )
    return test

test_file_id=uuid4()
test_chunk_create=make_chunk_create(test_file_id)

print(type(test_chunk_create))
print(test_chunk_create.file_id)
print(test_file_id==test_chunk_create.file_id)

fake_embedding=[0.0]*1024

async def run_test():


    with patch(
    "app.services.processing.ingest_document",
    return_value="fake_document",
    )as mock_ingest:
        with patch(
            "app.services.processing.extract_text",
            return_value="fake_extract_text",
        )as mock_extract:
            with patch(
                "app.services.processing.create_chunk",
                return_value=[test_chunk_create],
            )as mock_create:
                with patch(
                    "app.services.processing.embed_text",
                    return_value=[fake_embedding],
                )as mock_embed:
                    with patch(
                        "app.services.processing.add_chunks",
                        new_callable=AsyncMock,
                    )as mock_add:

                        course_id=uuid4()
                        ingestion_run_id=uuid4()
                        fake_session=AsyncMock()

                        await process_file(
                            file_id=test_file_id,
                            course_id=course_id,
                            ingestion_run_id=ingestion_run_id,
                            file_path="abc.pdf",
                            session=fake_session,
                        )
                        

                        print(mock_ingest.call_count)
                        print(mock_extract.call_count)
                        print(mock_create.call_count)
                        print(mock_embed.call_count)
                        print(mock_add.await_count)
                        print(mock_add.await_args)

asyncio.run(run_test())