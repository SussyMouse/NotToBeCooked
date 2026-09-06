from datetime import UTC, datetime
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.routers.files import course_files_router
from app.schemas.course import Course
from app.schemas.file import File as FileRow
from app.schemas.file import FileStatus


# Test Course with files
def test_list_course_files_returns_200_and_files():
    test_app = FastAPI()
    test_app.include_router(course_files_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()
    folder_id = uuid4()
    file_id = uuid4()

    fake_course = Course(
        id=course_id,
        user_id=user_id,
        code="SECJ3203",
        name="Software Engineering",
        year=2026,
        sem=1,
    )

    fake_file = FileRow(
        id=file_id,
        course_id=course_id,
        folder_id=folder_id,
        filename="lecture-1.pdf",
        storage_key=f"{user_id}/{file_id}/lecture-1.pdf",
        sha256="abc123",
        mime_type="application/pdf",
        size_bytes=1024,
        page_count=10,
        status=FileStatus.READY,
        error_message=None,
        uploaded_at=datetime.now(UTC),
        indexed_at=datetime.now(UTC),
    )

    course_result = Mock()
    course_result.first.return_value = fake_course

    files_result = Mock()
    files_result.all.return_value = [fake_file]

    fake_session = AsyncMock()
    fake_session.exec.side_effect = [
        course_result,
        files_result,
    ]

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.get(f"/courses/{course_id}/files")

    assert response.status_code == 200

    body = response.json()
    assert len(body) == 1

    returned_file = body[0]
    assert returned_file["id"] == str(file_id)
    assert returned_file["folder_id"] == str(folder_id)
    assert returned_file["filename"] == "lecture-1.pdf"
    assert returned_file["mime_type"] == "application/pdf"
    assert returned_file["size_bytes"] == 1024
    assert returned_file["page_count"] == 10
    assert returned_file["status"] == "ready"

    assert fake_session.exec.await_count == 2


# Test empty Course
def test_list_course_files_returns_empty_list_when_course_has_no_files():
    test_app = FastAPI()
    test_app.include_router(course_files_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()

    fake_course = Course(
        id=course_id,
        user_id=user_id,
        code="SECJ3203",
        name="Software Engineering",
        year=2026,
        sem=1,
    )

    course_result = Mock()
    course_result.first.return_value = fake_course

    files_result = Mock()
    files_result.all.return_value = []

    fake_session = AsyncMock()
    fake_session.exec.side_effect = [
        course_result,
        files_result,
    ]

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.get(f"/courses/{course_id}/files")

    assert response.status_code == 200
    assert response.json() == []

    assert fake_session.exec.await_count == 2


# Test Course not found
def test_list_course_files_returns_404_when_course_not_found():
    test_app = FastAPI()
    test_app.include_router(course_files_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()

    course_result = Mock()
    course_result.first.return_value = None

    fake_session = AsyncMock()
    fake_session.exec.return_value = course_result

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.get(f"/courses/{course_id}/files")

    assert response.status_code == 404
    assert response.json()["detail"] == "Course not found"

    fake_session.exec.assert_awaited_once()
