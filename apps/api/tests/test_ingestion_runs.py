from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.routers.ingestion_runs import ingestion_runs_router
from app.schemas.ingestion_run import IngestionRun


def test_get_ingestion_run_returns_own_run():
    test_app = FastAPI()
    test_app.include_router(ingestion_runs_router, prefix="/ingestion-runs")

    user_id = uuid4()
    file_id = uuid4()
    ingestion_run_id = uuid4()

    fake_ingestion_run = IngestionRun(
        id=ingestion_run_id,
        file_id=file_id,
        chunker_version="test_chunker_version",
        embedding_model="test__embedding_model",
        embedding_dim=1024,
    )

    fake_result = Mock()
    fake_result.scalar_one_or_none.return_value = fake_ingestion_run

    fake_session = AsyncMock()
    fake_session.execute.return_value = fake_result

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user
    client = TestClient(test_app)

    response = client.get(f"/ingestion-runs/{ingestion_run_id}")

    assert response.status_code == 200

    body = response.json()
    assert body["id"] == str(ingestion_run_id)
    assert body["file_id"] == str(file_id)
    assert body["status"] == "queued"
    assert body["started_at"] is None
    assert body["completed_at"] is None
    assert body["error_message"] is None


def test_get_ingestion_run_returns_404_not_found():
    test_app = FastAPI()
    test_app.include_router(ingestion_runs_router, prefix="/ingestion-runs")
    user_id = uuid4()
    ingestion_run_id = uuid4()

    fake_session = AsyncMock()
    fake_result = Mock()
    fake_session.execute.return_value = fake_result
    fake_result.scalar_one_or_none.return_value = None

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.get(f"/ingestion-runs/{ingestion_run_id}")

    assert response.status_code == 404
    body = response.json()
    assert body["detail"]["code"] == "INGESTION_RUN_NOT_FOUND"
    assert body["detail"]["message"] == "Ingestion run not found"
    fake_session.execute.assert_awaited_once()


def test_get_ingestion_run_returns_401_when_user_id_missing():
    test_app = FastAPI()
    test_app.include_router(ingestion_runs_router, prefix="/ingestion-runs")

    ingestion_run_id = uuid4()

    fake_session = AsyncMock()

    async def override_session():
        return fake_session

    async def override_current_user():
        return {}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.get(f"/ingestion-runs/{ingestion_run_id}")
    body = response.json()
    assert response.status_code == 401
    assert body["detail"]["code"] == "INVALID_TOKEN"
    assert body["detail"]["message"] == "Invalid or tampered token"
    fake_session.execute.assert_not_awaited()
