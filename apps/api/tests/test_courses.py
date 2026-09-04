from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.routers.courses import courses_router
from app.schemas.course import Course, CourseStatus


def test_create_course_returns_201():
    test_app = FastAPI()
    test_app.include_router(courses_router, prefix="/courses")

    user_id = uuid4()

    fake_session = AsyncMock()
    fake_session.add = Mock()

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)

    response = client.post(
        "/courses",
        json={
            "code": "cse123",
            "name": "Software Engineering",
            "year": 2026,
            "sem": 1,
        },
    )
    assert response.status_code == 201

    saved_course = fake_session.add.call_args.args[0]
    assert saved_course.user_id == user_id
    assert saved_course.code == "cse123"
    assert saved_course.name == "Software Engineering"
    assert saved_course.year == 2026
    assert saved_course.sem == 1

    fake_session.add.assert_called_once()
    fake_session.commit.assert_awaited_once()
    fake_session.refresh.assert_awaited_once_with(saved_course)


def test_list_courses_returns_list():
    test_app = FastAPI()
    test_app.include_router(courses_router, prefix="/courses")

    user_id = uuid4()
    fake_course = Course(
        user_id=user_id,
        code="SECJ3203",
        name="Software Engineering",
        year=2026,
        sem=1,
    )
    fake_session = AsyncMock()
    fake_result = Mock()
    fake_session.exec.return_value = fake_result
    fake_result.all.return_value = [fake_course]

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.get("/courses")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    course_body = body[0]

    assert course_body["id"] == str(fake_course.id)
    assert course_body["code"] == "SECJ3203"
    assert course_body["name"] == "Software Engineering"
    assert course_body["year"] == 2026
    assert course_body["sem"] == 1
    assert course_body["status"] == "active"

    fake_session.exec.assert_awaited_once()
    assert "user_id" not in course_body


def test_update_course_changes_only_provided_fields():
    test_app = FastAPI()
    test_app.include_router(courses_router, prefix="/courses")

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

    fake_result = Mock()
    fake_result.first.return_value = fake_course

    fake_session = AsyncMock()
    fake_session.add = Mock()
    fake_session.exec.return_value = fake_result

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)

    response = client.patch(
        f"/courses/{course_id}",
        json={
            "name": "Advanced Software Engineering",
        },
    )
    assert response.status_code == 200

    body = response.json()
    assert body["name"] == "Advanced Software Engineering"
    assert body["code"] == "SECJ3203"
    assert body["year"] == 2026
    assert body["sem"] == 1

    assert fake_course.name == "Advanced Software Engineering"
    assert fake_course.code == "SECJ3203"

    fake_session.exec.assert_awaited_once()
    fake_session.add.assert_not_called()
    fake_session.commit.assert_awaited_once()
    fake_session.refresh.assert_awaited_once_with(fake_course)


def test_update_course_returns_404_when_course_not_found():
    test_app = FastAPI()
    test_app.include_router(courses_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()

    fake_result = Mock()
    fake_result.first.return_value = None

    fake_session = AsyncMock()
    fake_session.exec.return_value = fake_result

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)

    response = client.patch(
        f"/courses/{course_id}",
        json={
            "name": "New Name",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Course not found"

    fake_session.exec.assert_awaited_once()
    fake_session.commit.assert_not_awaited()
    fake_session.refresh.assert_not_awaited()


def test_archive_course_returns_204():
    test_app = FastAPI()
    test_app.include_router(courses_router, prefix="/courses")

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

    fake_result = Mock()
    fake_result.first.return_value = fake_course

    fake_session = AsyncMock()
    fake_session.exec.return_value = fake_result

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.delete(f"/courses/{course_id}")

    assert response.status_code == 204
    assert response.content == b""
    assert fake_course.status == CourseStatus.ARCHIVED

    fake_session.exec.assert_awaited_once()
    fake_session.commit.assert_awaited_once()
    fake_session.delete.assert_not_awaited()
