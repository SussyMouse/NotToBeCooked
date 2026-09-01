# Backend API Development & Architecture Guide (`apps/api`)

This document outlines the standard architecture, directory structure, authentication protection patterns, and error handling guidelines for developing API endpoints in the `apps/api` service.

---

## 📂 1. Directory Structure — Where to Put Stuff

All backend application code lives inside `apps/api/app/`:

```
apps/api/app/
├── main.py                 # Application entrypoint, CORS, router mounting
├── core/                   # Non-domain specific, app-wide configs, settings and security setup 
├── db/                     # Database connection, engine, and get_session dependency
│   └── database.py
├── dependencies/           # Reusable FastAPI dependencies (e.g., get_current_user)
│   └── auth.py
├── schemas/                # SQLModel table models & Pydantic DTOs
│   ├── user.py             # User table, UserRead, UserCreate
│   ├── auth.py             # LoginRequest, RegisterRequest, TokenResponse
│   └── errors.py           # Standardized ApiError schema
├── routers/                # Endpoint handlers grouped by feature domain
│   └── auth.py             # Authentication endpoints (/auth/login, /auth/register)
└── lib/                    # Helper utilities (password hashing, token generation)
    └── security.py
```

### Folder Responsibilities:
* **`schemas/`**: Define your data models using SQLModel/Pydantic.
* **`routers/`**: HTTP route handlers (`@router.get`, `@router.post`). No raw database logic here — call services or database sessions.
* **`dependencies/`**: Functions used with FastAPI `Depends()` (e.g., authentication, DB sessions).
* **`lib/`**: Pure Python helper utility functions (Argon2 hashing, JWT signing/verifying).

---

## 🛠️ 2. How to Develop a New API Endpoint (Step-by-Step)

Follow this 3-step workflow when adding a new API feature:

### Step 1: Define Schemas (`app/schemas/`)
Create a schema using **SQLModel** with the base class inheritance pattern:

```python
# app/schemas/post.py
from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field

# Base shared fields
class PostBase(SQLModel):
    title: str = Field(..., min_length=3, max_length=100)
    content: str

# Database Table Model
class Post(PostBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    author_id: UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request DTO (Input)
class PostCreate(PostBase):
    pass

# Response DTO (Output)
class PostRead(PostBase):
    id: UUID
    author_id: UUID
    created_at: datetime
```

### Step 2: Create the Router (`app/routers/`)
Define route functions and specify `response_model`:

```python
# app/routers/posts.py
from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession
from app.db.database import get_session
from app.schemas.post import Post, PostCreate, PostRead

router = APIRouter()

@router.post("/", response_model=PostRead, status_code=status.HTTP_201_CREATED)
async def create_post(
    body: PostCreate, 
    session: AsyncSession = Depends(get_session)
):
    post = Post(title=body.title, content=body.content, author_id=...)
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return post
```

### Step 3: Mount Router in `app/main.py`
```python
# app/main.py
from app.routers import posts_router

app.include_router(posts_router, prefix="/posts", tags=["Posts"])
```

---

## 🔒 3. Authentication & Route Protection

Authentication relies on JWT Bearer Tokens validated by the `get_current_user` dependency in `app/dependencies/auth.py`.

### A. Protect an Individual Endpoint
Inject `current_user: dict = Depends(get_current_user)` as a parameter:

```python
from app.dependencies.auth import get_current_user

@router.get("/me", response_model=PostRead)
async def get_my_post(current_user: dict = Depends(get_current_user)):
    # Any request without a valid Bearer token is rejected automatically with HTTP 401
    user_id = current_user["sub"]
    ...
```

### B. Protect an Entire Router Group
To require authentication for **all** endpoints under a router, pass `dependencies` when mounting in `app/main.py`:

```python
from app.dependencies.auth import get_current_user
from app.routers import posts_router

# All /posts endpoints now automatically require a valid JWT token!
app.include_router(
    posts_router,
    prefix="/posts",
    tags=["Posts"],
    dependencies=[Depends(get_current_user)]
)
```

---

## ⚠️ 4. Request / Response Structure & Error Handling

### Standardized Error Format (`ApiError`)
Application errors use the `ApiError` schema (`app/schemas/errors.py`):

```python
class ApiError(SQLModel):
    code: str
    message: str
```

#### Throwing Custom Application Errors:
Always raise `HTTPException` with a structured `detail` dictionary:

```python
from fastapi import HTTPException, status
from app.schemas.errors import ApiError

@router.post(
    "/login", 
    response_model=TokenResponse,
    responses={401: {"model": ApiError, "description": "Invalid credentials"}}
)
async def login(body: LoginRequest):
    if not valid_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Email or password incorrect"}
        )
```

### Response Formats Comparison:

| Error Type | Status Code | Returned Body Format | Triggered By |
| :--- | :--- | :--- | :--- |
| **Application Error** | `400` / `401` / `404` | `{"detail": {"code": "ERR_CODE", "message": "Reason"}}` | Raised manually via `HTTPException` |
| **Validation Error** | `422 Unprocessable Entity` | `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` | Triggered automatically by Pydantic on invalid JSON inputs |
| **Auth Error** | `401 Unauthorized` | `{"detail": "Token has expired"}` | Triggered by `get_current_user` dependency |

---

## 🧪 5. Testing Your Endpoints
- **Swagger Docs**: Open `http://localhost:8000/docs` to test endpoints interactively.
- **REST Client**: Use `test_auth.http` inside your IDE to execute requests directly.

---

## 🧩 6. Local Setup Gotcha — `opencv-python` breaks Docling

**Symptom.** Any call to `POST /files/{file_id}/ingest` returns 500, and the
server log ends with:

```
File ".../docling_ibm_models/tableformer/data_management/functional.py", line 9
    cv2.setNumThreads(0)
AttributeError: module 'cv2' has no attribute 'setNumThreads'
```

or, once opencv is reinstalled:

```
ImportError: libgthread-2.0.so.0: cannot open shared object file
```

**This is already documented, and there is already a check for it.** Read the
docstring of `scripts/smoke.py` — it explains the cause (docling →
docling-slim[standard] → rapidocr → the GUI opencv build, which links X11 and
glib), names the machines it hits, and gives the fix. Its check 1 is exactly
this import, and its check 4 parses a real PDF through Docling.

```bash
cd apps/api
uv pip uninstall opencv-python opencv-python-headless
uv pip install opencv-python-headless==5.0.0.93
uv run --no-sync python scripts/smoke.py
```

This section exists only to put the symptom somewhere a developer will look
**while a request is failing in front of them**. Nobody hunting a 500 opens a
smoke-test script; the traceback names `cv2`, and `cv2` appears in no dependency
list we wrote.

**Redo the swap after every `uv sync`**, and use `uv run --no-sync` while working
on ingestion. Check 1 of `smoke.py` going red is the signal that a sync undid it.

### Green tests do not mean ingestion runs

`pnpm verify` never loads a model, opens a PDF, or links a shared library, and
`tests/test_processing.py` patches `ingest_document`, `extract_text`,
`create_chunk`, `embed_text` and `add_chunks` — every real call in the pipeline.
That is the right shape for a unit test, but it means the suite is green whether
or not Docling can load. **`scripts/smoke.py` is the thing that answers "does it
actually run", and it is deliberately not part of `pnpm verify`** because a cold
run pulls ~1.9 GB of weights.

Until `POST /files/{file_id}/ingest` landed on 31 Aug 2026, `run_ingestion` had
no production caller, so the pipeline had never run *through the application* —
only through that smoke script, by hand.

### How long ingestion takes

Measured 31 Aug 2026 on a 4.5 MB, 55-slide lecture PDF, the first end-to-end run
through the API:

```
POST /files          upload     0.02 s
POST /files/{id}/ingest       430.84 s      -> 42 chunks
POST /rag/query                 0.03 s
```

Parsing dominates by four orders of magnitude. Plan any change to the ingest
endpoint around seven minutes of work per file, not seconds.

---

## 🌱 7. Getting a `folder_id` — `scripts/seed_folder.py`

`POST /files` needs a `folder_id` whose course belongs to the caller, and **no
endpoint creates a COURSE or a FOLDER yet**. Until `POST /courses` and
`POST /courses/{course_id}/folders` exist, make one directly:

```bash
cd apps/api
uv run python scripts/seed_folder.py you@example.com   # register the account first
```

It prints a `folder_id` and a ready-to-paste `curl`. Delete the script the day
those endpoints land.
