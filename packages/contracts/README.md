# 📜 Schemas & Contracts Onboarding Guide

Welcome! This monorepo uses a **single source of truth** pattern for API schemas between our **Python FastAPI backend** (`apps/api`) and **TypeScript apps** (`apps/web`, `apps/desktop`).

---

## 💡 How It Works (In 30 Seconds)

1. **Python is the Boss:** You write Pydantic schemas in Python (`apps/api/app/schemas/`).
2. **FastAPI generates OpenAPI:** Python outputs `packages/contracts/openapi.json`.
3. **TypeScript auto-syncs:** `openapi-typescript` converts the JSON spec into TypeScript types in `packages/contracts/src/schema.ts`.
4. **Apps import `@workspace/contracts`:** Frontend apps import clean TS types with full autocomplete.

---

## 🛠️ Step-by-Step Guide: How to Add or Update a Schema

### Step 1: Create or update your Pydantic model (Python)
Go to `apps/api/app/schemas/` (e.g. `user.py`, `course.py`) and define your request/response models:

```python
# apps/api/app/schemas/course.py
from pydantic import BaseModel
from uuid import UUID

class CourseRead(BaseModel):
    id: UUID
    name: str
    code: str

class CourseCreate(BaseModel):
    name: str
    code: str
```

### Step 2: Use the model in a FastAPI endpoint
Attach your schema as a `response_model` or request body in `apps/api/app/main.py`:

```python
# apps/api/app/main.py
from app.schemas.course import CourseRead, CourseCreate

@app.post("/courses", response_model=CourseRead)
def create_course(course: CourseCreate):
    ...
```

### Step 3: Run the Schema Sync command 🚀
In your terminal at the root of the repository, run:

```bash
pnpm schema:update
```
*(Alias: `pnpm codegen`)*

This single command will:
1. Dump the updated FastAPI schema to `packages/contracts/openapi.json`.
2. Re-generate TypeScript types in `packages/contracts/src/schema.ts`.

### Step 4: Export clean type aliases (If adding a new schema)
Open `packages/contracts/src/index.ts` and add your new type exports:

```ts
// packages/contracts/src/index.ts
import type { components } from "./schema.js";

export type CourseRead = components["schemas"]["CourseRead"];
export type CourseCreate = components["schemas"]["CourseCreate"];
```

### Step 5: Import in your TypeScript Frontend!
In `apps/web` or `apps/desktop`:

```ts
import type { CourseCreate, CourseRead } from "@workspace/contracts";

export async function createCourse(data: CourseCreate): Promise<CourseRead> {
  const res = await fetch("http://localhost:8000/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}
```

---

## 🛑 Rule of Thumb: What Goes Where?

| What are you building? | Where does it live? | Example |
| :--- | :--- | :--- |
| **Database Table & Passwords** | `apps/api/app/db/models/` | `password_hash`, DB indexes, SQLModel |
| **API Request & Response DTOs** | `apps/api/app/schemas/` | `UserRead`, `CourseCreate` |
| **Shared TS Types** | `@workspace/contracts` | `import type { UserRead } from "@workspace/contracts"` |
| **Client Form Validation** | `apps/web/src/schemas/` | Zod forms, `confirmPassword` UI check |

---

## ❓ FAQ & Troubleshooting

* **Q: Why are my new TypeScript types not showing up?**
  * Did you add your route to `apps/api/app/main.py`? FastAPI only includes schemas in `openapi.json` if they are attached to an active API route!
  * Did you run `pnpm schema:update`?

* **Q: Do I manually edit `packages/contracts/src/schema.ts`?**
  * ❌ **No.** `schema.ts` is auto-generated. Any manual changes will be overwritten when running `pnpm schema:update`. Always edit the Pydantic schema in Python instead.
