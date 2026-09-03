from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.routers.courses import courses_router
from app.schemas.course import Course


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
