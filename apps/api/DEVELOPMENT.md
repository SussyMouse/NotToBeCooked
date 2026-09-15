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
- **Test suite**: `pnpm --filter api test` — 87 tests against a real PostgreSQL.
- **Smoke check**: `uv run --no-sync python scripts/smoke.py` — five checks that only
  fail on real hardware. Run it after every `uv sync` (see section 6).

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

**Redo the swap after every `uv sync`.** As of 1 Sep 2026 the package scripts no
longer sync on your behalf — `lint`, `test`, `dev` and `schema:update` all pass
`--no-sync`, so `pnpm verify` does not silently reinstall the GUI build behind
your back. It used to: every `pnpm verify` put `opencv-python` back and broke
ingestion, while verify itself stayed 13/13 green because nothing in it touches
Docling.

The cost of that change is that **a lockfile change no longer installs itself**.
After pulling a branch that adds a dependency, run `uv sync` explicitly — and
then redo the opencv swap, because the sync will have undone it. Check 1 of
`smoke.py` going red is the signal that something synced.

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

---

## 🤝 8. `packages/contracts` is checked, not trusted

`pnpm verify` ends with `pnpm contracts:check`, which regenerates the OpenAPI
document from the running app and compares it to the committed
`packages/contracts/openapi.json`. A difference fails the build and prints the
paths and schemas that moved.

**It exists because the file went stale and nothing noticed.** On 1 Sep 2026
CR-33 moved the ingest endpoint to 202 and made `ingestion_run_id` required;
`openapi.json` was not regenerated, so for several hours it described a 200 with
`status` still carrying `"uploaded"` — while `pnpm verify` was 13/13 the whole
time. The frontend would have been typed against a backend that no longer
existed.

When it fails, the fix is one command:

```bash
pnpm schema:update
```

The check is **outside** turbo, in the root `verify` script rather than in
`api#lint`. Turbo caches a task on its own package's inputs, and
`packages/contracts/openapi.json` is not one of `apps/api`'s — so inside `lint`
it was cached away and never ran. That is worth remembering for any future check
that reads a file from another package.

---

## 🐳 9. Docker here, podman on the deployment box

Decision 3 of the 15 September 2026 meeting, **option C: run both, and write
down where they differ.** The OCI box runs Oracle Linux with SELinux Enforcing
and rootless podman, which already works; your machine runs Docker, which
already works. Making either side match the other costs more than this section.

Three differences that actually cost someone time. They are not style
differences — each one has a failure mode where nothing reports an error.

### 9.1 `restart: always` does nothing on the deployment box

Both services in `docker-compose.yml` carry `restart: always`, and the Docker
daemon honours it across a reboot. **Rootless podman has no daemon**, and
ignores `--restart` at `run` time. Three things bring a container back after a
reboot, and all three are required:

```bash
podman update --restart=always nttbc_db
systemctl --user enable --now podman-restart.service
loginctl enable-linger "$USER"
```

`linger` is the one that gets missed. Without it your entire user systemd
instance is torn down when you log out — container and API together, with no
error anywhere, because nothing failed: it was stopped on purpose. The same
setting is what lets the API's systemd **user** unit survive logout, so one
`enable-linger` covers both.

### 9.2 There is no compose file on the deployment box

`apps/api/docker-compose.yml` describes **your machine only**. On the OCI box
Postgres is a plain `podman run`, and the API is a systemd *user* unit rather
than a system unit — a system unit cannot start it at all: SELinux is Enforcing
and denies `init_t` so much as reading `.venv/bin/python` under `/home` (AVC
`tcontext=...:user_home_t:s0 tclass=lnk_file`). Relabelling would work and would
be undone by the next `uv sync`.

**So editing `docker-compose.yml` changes nothing on the deployment box**, and
changing the unit file changes nothing here. Two consequences worth knowing:

- Reading the unit's logs is `journalctl --user -u nttbc-api`. A *system*
  `journalctl -u nttbc-api` prints nothing and exits 0, because the unit is not
  in that journal. `--user-unit=nttbc-api` filters by unit name in whatever
  journal you are already reading, which is the flag you want when you are not
  sure which one you are in.
- `.env` is not the way to set an environment variable the process must see
  before `import`. pydantic-settings reads it into the `Settings` object, not
  into `os.environ` — `TORCHDYNAMO_DISABLE=1` has to be an `Environment=` line
  in the unit.

### 9.3 When a port is taken, you cannot see what is holding it

Docker publishes ports through a `docker-proxy` process **running as root**, so
your own `ss` cannot name it:

```
$ ss -ltnp | grep :5432
LISTEN 0 4096 0.0.0.0:5432 0.0.0.0:*      <- no users: column at all
LISTEN 0 4096    [::]:5432    [::]:*
```

An empty `users:` column does not mean nothing is listening. It means the
listener belongs to another user, and you need `sudo ss -ltnp` to see it.
`0.0.0.0` and `[::]` appearing together on the same port is the signature of a
published container port. Rootless podman publishes through `rootlessport` in
your own user namespace, so plain `ss -ltnp` names it.

This is what a failing `pnpm run dev` looks like: turbo tears down all four dev
tasks because one of them could not bind, and the only line that says why is
`[Errno 98] Address already in use` several screens up.

### Both sides share one trap: editing compose does not touch a running container

`db87c57` (9 Sep) rebound Postgres from `0.0.0.0` to `127.0.0.1`. The container
on the development laptop had been created three weeks earlier and kept
publishing on `0.0.0.0` until **15 Sep**, because nothing recreates a container
just because the file that described it changed. `docker compose up -d` alone is
not enough when only the ports changed:

```bash
docker compose up -d --force-recreate db
docker port not_to_be_cooked_db      # expect exactly: 5432/tcp -> 127.0.0.1:5432
```

Named volumes survive `--force-recreate`; the data lives in `api_pgvector_data`,
not in the container.

---

## 🧬 10. `docs/erd/CODE_VS_ERD.md` is generated, and checked

Decision 4 of the 15 September 2026 meeting, option A. `pnpm verify` ends with
`pnpm erd:check`, which re-derives the comparison between `docs/erd/erd.mmd` and
`app/schemas/*.py` and fails the build if the committed document no longer
matches either side.

When it fails, the fix is one command:

```bash
cd apps/api && uv run python scripts/erd_diff.py --write
```

**It exists because the document asked for it and nobody could hear.**
`CODE_VS_ERD.md` says of itself that a stale diff is worse than none, because it
will be trusted. It was last regenerated by hand on 20 August and was still
being read on 10 September.

Two things it deliberately does not compare, so that it stays worth reading:
**nullability**, because `erd.mmd` has no syntax for it and silence in a diagram
is not a claim; and **type spellings**, because `string` and `VARCHAR` are one
decision written two ways. Types are compared as families, against
`postgresql.dialect()` — without the dialect SQLAlchemy renders UUID as
`CHAR(32)` and every timestamptz as `DATETIME`, which produced seventeen
mismatches in August, all of them artefacts.

Like `contracts:check`, this lives in the **root** `verify` script rather than
in `api#lint`, for the reason in section 8: turbo caches a task on its own
package's inputs, and `docs/erd/` is not one of `apps/api`'s.
