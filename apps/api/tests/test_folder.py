from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.routers.folder import folders_router
from app.schemas.course import Course
from app.schemas.folder import Folder


def test_create_root_folder_returns_201():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

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

    fake_session = AsyncMock()
    fake_result = Mock()

    fake_session.exec.return_value = fake_result
    fake_result.first.return_value = fake_course

    fake_session.add = Mock()

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)

    response = client.post(
        f"/courses/{course_id}/folders",
        json={
            "name": "Lecture Notes",
        },
    )

    assert response.status_code == 201

    body = response.json()
    assert body["course_id"] == str(course_id)
    assert body["parent_folder_id"] is None
    assert body["name"] == "Lecture Notes"
    assert body["is_root"] is True
    assert body["sort_order"] == 0
    saved_folder = fake_session.add.call_args.args[0]
    assert saved_folder.course_id == course_id
    assert saved_folder.parent_folder_id is None
    assert saved_folder.is_root is True

    fake_session.exec.assert_awaited_once()
    fake_session.add.assert_called_once_with(saved_folder)
    fake_session.commit.assert_awaited_once()
    fake_session.refresh.assert_awaited_once_with(saved_folder)


def test_create_folder_returns_404_when_course_not_found():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()

    fake_result = Mock()
    fake_result.first.return_value = None

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

    response = client.post(
        f"/courses/{course_id}/folders",
        json={"name": "Lecture Notes"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Course not found"

    fake_session.exec.assert_awaited_once()
    fake_session.add.assert_not_called()
    fake_session.commit.assert_not_awaited()
    fake_session.refresh.assert_not_awaited()


def test_create_folder_returns_404_when_parent_not_found():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()
    parent_folder_id = uuid4()

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

    parent_result = Mock()
    parent_result.first.return_value = None

    fake_session = AsyncMock()
    fake_session.add = Mock()
    fake_session.exec.side_effect = [course_result, parent_result]

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.post(
        f"/courses/{course_id}/folders",
        json={
            "name": "Week 1",
            "parent_folder_id": str(parent_folder_id),
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Parent folder not found"

    assert fake_session.exec.await_count == 2
    fake_session.add.assert_not_called()
    fake_session.commit.assert_not_awaited()
    fake_session.refresh.assert_not_awaited()


def test_list_folders_returns_200_and_folder_list():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

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

    fake_folder = Folder(
        course_id=course_id,
        parent_folder_id=None,
        name="Lecture Notes",
        is_root=True,
        sort_order=0,
    )

    course_result = Mock()
    course_result.first.return_value = fake_course

    folders_result = Mock()
    folders_result.all.return_value = [fake_folder]

    fake_session = AsyncMock()
    fake_session.exec.side_effect = [
        course_result,
        folders_result,
    ]

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.get(f"/courses/{course_id}/folders")

    assert response.status_code == 200

    body = response.json()
    assert len(body) == 1

    folder_body = body[0]
    assert folder_body["id"] == str(fake_folder.id)
    assert folder_body["course_id"] == str(course_id)
    assert folder_body["parent_folder_id"] is None
    assert folder_body["name"] == "Lecture Notes"
    assert folder_body["is_root"] is True
    assert folder_body["sort_order"] == 0

    assert fake_session.exec.await_count == 2


def test_list_folders_returns_404_when_course_not_found():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

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
    response = client.get(f"/courses/{course_id}/folders")

    assert response.status_code == 404
    assert response.json()["detail"] == "Course not found"

    fake_session.exec.assert_awaited_once()


def test_get_folder_returns_200():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()
    folder_id = uuid4()

    fake_folder = Folder(
        id=folder_id,
        course_id=course_id,
        parent_folder_id=None,
        name="Lecture Notes",
        is_root=True,
        sort_order=0,
    )

    fake_result = Mock()
    fake_result.first.return_value = fake_folder

    fake_session = AsyncMock()
    fake_session.exec.return_value = fake_result

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.get(f"/courses/{course_id}/folders/{folder_id}")

    assert response.status_code == 200

    body = response.json()
    assert body["id"] == str(folder_id)
    assert body["course_id"] == str(course_id)
    assert body["name"] == "Lecture Notes"
    assert body["is_root"] is True
    assert body["sort_order"] == 0

    fake_session.exec.assert_awaited_once()


def test_get_folder_returns_404_when_folder_not_found():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()
    folder_id = uuid4()

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
    response = client.get(f"/courses/{course_id}/folders/{folder_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Folder not found"

    fake_session.exec.assert_awaited_once()


def test_update_folder_changes_only_provided_fields():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()
    folder_id = uuid4()

    fake_folder = Folder(
        id=folder_id,
        course_id=course_id,
        parent_folder_id=None,
        name="Lecture Notes",
        is_root=True,
        sort_order=3,
    )

    fake_result = Mock()
    fake_result.first.return_value = fake_folder

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
        f"/courses/{course_id}/folders/{folder_id}",
        json={
            "name": "Tutorial Notes",
        },
    )

    assert response.status_code == 200

    body = response.json()
    assert body["id"] == str(folder_id)
    assert body["name"] == "Tutorial Notes"
    assert body["sort_order"] == 3

    assert fake_folder.name == "Tutorial Notes"
    assert fake_folder.sort_order == 3

    fake_session.exec.assert_awaited_once()
    fake_session.add.assert_not_called()
    fake_session.commit.assert_awaited_once()
    fake_session.refresh.assert_awaited_once_with(fake_folder)


def test_update_folder_returns_404_when_folder_not_found():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()
    folder_id = uuid4()

    fake_result = Mock()
    fake_result.first.return_value = None

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
        f"/courses/{course_id}/folders/{folder_id}",
        json={
            "name": "Tutorial Notes",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Folder not found"

    fake_session.exec.assert_awaited_once()
    fake_session.add.assert_not_called()
    fake_session.commit.assert_not_awaited()
    fake_session.refresh.assert_not_awaited()


def test_delete_empty_folder_returns_204():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()
    folder_id = uuid4()

    fake_folder = Folder(
        id=folder_id,
        course_id=course_id,
        parent_folder_id=None,
        name="Lecture Notes",
        is_root=True,
        sort_order=0,
    )

    folder_result = Mock()
    folder_result.first.return_value = fake_folder

    child_result = Mock()
    child_result.first.return_value = None

    file_result = Mock()
    file_result.first.return_value = None

    fake_session = AsyncMock()
    fake_session.exec.side_effect = [
        folder_result,
        child_result,
        file_result,
    ]

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.delete(f"/courses/{course_id}/folders/{folder_id}")

    assert response.status_code == 204
    assert response.content == b""

    assert fake_session.exec.await_count == 3
    fake_session.delete.assert_awaited_once_with(fake_folder)
    fake_session.commit.assert_awaited_once()


def test_delete_folder_returns_404_when_folder_not_found():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()
    folder_id = uuid4()

    folder_result = Mock()
    folder_result.first.return_value = None

    fake_session = AsyncMock()
    fake_session.exec.return_value = folder_result

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.delete(f"/courses/{course_id}/folders/{folder_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Folder not found"

    fake_session.exec.assert_awaited_once()
    fake_session.delete.assert_not_awaited()
    fake_session.commit.assert_not_awaited()


def test_delete_folder_returns_409_when_child_folder_exists():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()
    folder_id = uuid4()

    fake_folder = Folder(
        id=folder_id,
        course_id=course_id,
        parent_folder_id=None,
        name="Lecture Notes",
        is_root=True,
        sort_order=0,
    )

    fake_child_folder = Folder(
        course_id=course_id,
        parent_folder_id=folder_id,
        name="Week 1",
        is_root=False,
        sort_order=0,
    )

    folder_result = Mock()
    folder_result.first.return_value = fake_folder

    child_result = Mock()
    child_result.first.return_value = fake_child_folder

    fake_session = AsyncMock()
    fake_session.exec.side_effect = [
        folder_result,
        child_result,
    ]

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.delete(f"/courses/{course_id}/folders/{folder_id}")

    assert response.status_code == 409
    assert response.json()["detail"] == "Folder is not empty"

    assert fake_session.exec.await_count == 2
    fake_session.delete.assert_not_awaited()
    fake_session.commit.assert_not_awaited()


def test_delete_folder_returns_409_when_file_exists():
    test_app = FastAPI()
    test_app.include_router(folders_router, prefix="/courses")

    user_id = uuid4()
    course_id = uuid4()
    folder_id = uuid4()

    fake_folder = Folder(
        id=folder_id,
        course_id=course_id,
        parent_folder_id=None,
        name="Lecture Notes",
        is_root=True,
        sort_order=0,
    )

    folder_result = Mock()
    folder_result.first.return_value = fake_folder

    child_result = Mock()
    child_result.first.return_value = None

    file_result = Mock()
    file_result.first.return_value = Mock()

    fake_session = AsyncMock()
    fake_session.exec.side_effect = [
        folder_result,
        child_result,
        file_result,
    ]

    async def override_session():
        return fake_session

    async def override_current_user():
        return {"sub": str(user_id)}

    test_app.dependency_overrides[get_session] = override_session
    test_app.dependency_overrides[get_current_user] = override_current_user

    client = TestClient(test_app)
    response = client.delete(f"/courses/{course_id}/folders/{folder_id}")

    assert response.status_code == 409
    assert response.json()["detail"] == "Folder is not empty"

    assert fake_session.exec.await_count == 3
    fake_session.delete.assert_not_awaited()
    fake_session.commit.assert_not_awaited()
