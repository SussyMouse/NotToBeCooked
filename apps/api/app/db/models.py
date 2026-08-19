from app.schemas.chunk import Chunk
from app.schemas.folder import Folder
from app.schemas.ingestion_run import IngestionRun


def register_models() -> None:
    _ = (Chunk, Folder, IngestionRun)
