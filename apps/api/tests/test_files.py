from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.routers.files import files_router


def test_ingest_file_creates_run_returns_202():
    test_app = FastAPI()
    test_app.include_router(files_router, prefix="/files")

    user_id = uuid4()
    file_id = uuid4()
    fake_file_record = Mock()
    fake_result = Mock()
    fake_result.scalar_one_or_none.return_value = fake_file_record
    fake_session = AsyncMock()
    fake_session.add = Mock()
    fake_session.execute.return_value = fake_result

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.post(f"/files/{file_id}/ingest")
    assert response.status_code == 202
    body = response.json()
    assert body["file_id"] == str(file_id)
    assert body["ingestion_run_id"] is not None
    assert body["status"] == "queued"
    assert body["chunk_count"] is None
    assert body["error"] is None

    fake_session.execute.assert_awaited_once()
    fake_session.add.assert_called_once()
    fake_session.commit.assert_awaited_once()
    fake_session.refresh.assert_awaited_once()


def test_ingest_file_returns_404_when_file_not_found():
    test_app = FastAPI()
    test_app.include_router(files_router, prefix="/files")

    user_id = uuid4()
    file_id = uuid4()
    fake_result = Mock()
    fake_result.scalar_one_or_none.return_value = None
    fake_session = AsyncMock()
    fake_session.add = Mock()
    fake_session.execute.return_value = fake_result

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.post(f"/files/{file_id}/ingest")
    assert response.status_code == 404
    body = response.json()
    assert body["detail"]["code"] == "FILE_NOT_FOUND"
    assert body["detail"]["message"] == "File not found"

    fake_session.execute.assert_awaited_once()
    fake_session.add.assert_not_called()
    fake_session.commit.assert_not_awaited()
    fake_session.refresh.assert_not_awaited()


def test_get_ingestion_run_returns_401_when_user_id_missing():
    test_app = FastAPI()
    test_app.include_router(files_router, prefix="/files")

    file_id = uuid4()
    fake_session = AsyncMock()
    fake_session.add = Mock()

    async def override_session():
        return fake_session

    async def override_current_user():
        return {}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.post(f"/files/{file_id}/ingest")
    body = response.json()
    assert response.status_code == 401
    assert body["detail"]["code"] == "INVALID_TOKEN"
    assert body["detail"]["message"] == "Invalid or tampered token"
    fake_session.execute.assert_not_awaited()
    fake_session.add.assert_not_called()
    fake_session.commit.assert_not_awaited()
    fake_session.refresh.assert_not_awaited()
