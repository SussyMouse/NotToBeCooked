# Code vs ERD — field-by-field diff, 17 Aug 2026

**What was compared**

- **ERD of record**: `docs/erd/erd.mmd` at `origin/dev`. Nine entities. Ratified 27 Jul, amended 4 Aug (CR-23) and 15 Aug (CR-24 → CR-27), handed in 16 Aug.
- **Code**: `origin/yong-zhou` at `e03d737`. Taken by **introspecting `SQLModel.metadata`** in the `apps/api` virtualenv after importing `app.models` — not read off the source and summarised.

**Why now**: the first migration lands 19 Aug. `autogenerate` follows the **code**, not the diagram. The first migration is the foundation of the database; changing it afterwards means either dropping the database or writing a second migration to undo the first.

---

## Totals

| | |
|---|---|
| Entities in the ERD | 9 |
| Tables in the code | 7 |
| **Entities with no table at all** | **3** — `FOLDER`, `MILESTONE`, `INGESTION_RUN` |
| **Tables with no entity** | **1** — `conversationcourselink` |
| **Columns missing from the code** | **37** |
| **Columns only in the code** | **4** |
| Renames | 2 |
| **Foreign keys declaring `ON DELETE`** | **0 of 7** |

> 28 of the 37 missing columns belong to the three absent tables. **The remaining 9 are spread across four tables that do exist, and those are the ones a migration will freeze in place without anyone noticing.**

---

## A. Three entities have no table

`autogenerate` cannot invent them. The first migration will not contain these three unless the models are written first.

| Entity | Columns | What is waiting on it |
|---|---|---|
| `FOLDER` | 7 | Added by CR-25. `FILE.folder_id` points at it — without `FOLDER`, `FILE` has to hang off `course_id` instead, which is what the code does today |
| `MILESTONE` | 11 | **All of F4.** `status` and `file_ids` are what US-16 and US-17 are built on. Scheduled as task #15, 23–26 Aug |
| `INGESTION_RUN` | 10 | Added by CR-25. `CHUNK.ingestion_run_id` points at it; `embedding_dim`, `is_active` and `chunker_version` live here |

`INGESTION_RUN` matters more than its position in this list suggests. The ERD moved `embedding_dim` off `CHUNK` and onto the run — the annotation reads *"was CHUNK.embedding 1536-dim; the run now owns the dimension"*. The code still fixes it on the chunk as `VECTOR(1024)`. **On the day the embedding model changes, that difference decides whether the work is one new run row or a full HNSW rebuild.**

---

## B. Four existing tables, nine columns apart

### B1 `FILE` — ERD 12 columns, code 11

| | |
|---|---|
| **Missing** | `folder_id` · `sha256` · `indexed_at` |
| **Only in code** | `course_id` · `category` |
| **Renamed** | `storage_key` → `storage_path` |

`course_id` versus `folder_id` is not one column more and one column less — it is **a different ownership structure**. The ERD says *"course is derived through the folder, not stored again"*. The code attaches a file to a course directly.

**Both work; only one can be built.** Whichever is chosen also decides where `CHUNK.course_id` gets its value.

`sha256` is the column from finding R7 — kept, but deliberately **not** UNIQUE, because two users may upload the same PDF. The code does not have the column at all.

### B2 `CHUNK` — ERD 13 columns, code 11

| | |
|---|---|
| **Missing** | `ingestion_run_id` · `course_id` |
| **Renamed** | `page_start` → `page_number` |

**`course_id` is the most expensive column on this list.** Its ERD annotation reads *"denormalised, this is the filter in front of the HNSW scan"*. Without it, filtering by course requires joining `chunk → file → course`, and that join has to run in front of the vector scan.

`page_start` was renamed on 16 Aug. **Bao Sheng's `create_chunk()` also emits `page_number`** — so across the ERD, the model and the ingestion code it currently stands two to one.

### B3 `CONVERSATION` — 5 columns each, different contents

| | |
|---|---|
| **Missing** | `course_id` |
| **Only in code** | `user_id`, with an index `ix_conversation_user_id` |
| **Extra** | the code also has a `conversationcourselink` junction table |

**This is the widest gap in the list.** The ERD models one conversation with one home course (`COURSE ||--o{ CONVERSATION : "is home course of"`). The code models a conversation owned by a user, with courses attached many-to-many through a junction table.

This is not an omission. It is **two different data models**, and 18 Aug has to pick one — a choice that also carries B4 with it.

### B4 `MESSAGE` — ERD 10 columns, code 7

| | |
|---|---|
| **Missing** | `scope_course_id` · `grounded` · `scope_snapshot` |

- **`scope_course_id`** — added by CR-24, `NOT NULL`, and the subject of the CASCADE-versus-RESTRICT decision recorded as R3. **It does not exist in the code, so that decision currently has nothing to attach to.**
- **`grounded`** — a boolean meaning every claim in the turn is backed by a cited source. The ERD makes it a column rather than something parsed back out of the reply text.
- **`scope_snapshot`** — what retrieval was allowed to see, frozen at write time. Same purpose as `citations`: it has to survive later edits to the corpus.

### B5 `USER` — ERD 4 columns, code 5

| | |
|---|---|
| **Only in code** | `display_name` |

The one case where the code has more than the ERD and the extra is clearly worth keeping. Suggest resolving it the other way round: **add `display_name` to the ERD** rather than removing it from the code.

### B6 `COURSE` — exact match

8 columns for 8, no differences. `name`, added 16 Aug, is present on both sides.

---

## C. No foreign key declares `ON DELETE`

```
chunk.file_id                          -> file.id           ON DELETE (unset -> NO ACTION)
conversation.user_id                   -> user.id           ON DELETE (unset -> NO ACTION)
conversationcourselink.conversation_id -> conversation.id   ON DELETE (unset -> NO ACTION)
conversationcourselink.course_id       -> course.id         ON DELETE (unset -> NO ACTION)
course.user_id                         -> user.id           ON DELETE (unset -> NO ACTION)
file.course_id                         -> course.id         ON DELETE (unset -> NO ACTION)
message.conversation_id                -> conversation.id   ON DELETE (unset -> NO ACTION)

7 foreign keys, 0 with an explicit ON DELETE
```

The ERD states one explicitly — `MESSAGE.scope_course_id` → RESTRICT — and that column does not exist in the code.

Unset means `NO ACTION`, which behaves close to RESTRICT in that it blocks the delete. Two reasons that is still not good enough:

1. It is **a default, not a decision**. Nothing distinguishes "considered it and chose RESTRICT" from "never thought about it".
2. `NO ACTION` and `RESTRICT` are not identical in PostgreSQL. `NO ACTION` can be `DEFERRABLE`, deferring the check to the end of the transaction; `RESTRICT` cannot.

**Suggest declaring `ondelete=` on every foreign key in the first migration**, even where the value is `"RESTRICT"`. The migration is the only place these decisions will ever be read.

---

## D. Types

Mostly correct. What already lines up:

| Check | Result |
|---|---|
| `uuid` renders as PostgreSQL `UUID` | ✅ |
| `timestamptz` renders as `TIMESTAMP WITH TIME ZONE` | ✅ |
| `enum status` is a real PG enum, `filestatus` | ✅ |
| `enum role` is a real PG enum, `chatrole` | ✅ |
| `vector` renders as `VECTOR(1024)` | ✅ (dimension below) |

**One mismatch:**

| Column | ERD | Code |
|---|---|---|
| `FILE.size_bytes` | `bigint` | `INTEGER` |

`INTEGER` caps at roughly 2.1 GB. Course material is unlikely ever to reach it, but **changing it now is free and changing it after there is data means an `ALTER`**.

**One thing to confirm:** `chunk.embedding` is `VECTOR(1024)`, and `EMBEDDINGS_DIM = 1024` is **hardcoded** at `app/schemas/chunk.py:12`, duplicating `app/core/config.py:29`. The first migration should reference `settings.EMBEDDINGS_DIM` rather than becoming a third copy.

1024 is confirmed as final, but it is still **CR-28** and needs 18 Aug. The ERD still records 1536.

---

## E. Decisions needed on 18 Aug, most expensive first

| # | Decision | Cost of not deciding | Owner |
|---|---|---|---|
| 1 | **Which `CONVERSATION` model** — the ERD's home course, or the code's user + many-to-many | The first migration freezes one of them. Switching later touches three tables | Whole team |
| 2 | **Does `FILE` hang off `folder` or `course`** | Also determines where `CHUNK.course_id` comes from | Whole team |
| 3 | **CR-28, embeddings at 1024** | The migration has to write a dimension | AI-1 |
| 4 | **`MESSAGE.scope_course_id` + RESTRICT** (R3 re-vote) | Without the column, that decision has nothing to attach to | Whole team |
| 5 | `FILE.size_bytes` → bigint | Free now, an `ALTER` later | Lead |
| 6 | Add `USER.display_name` to the ERD | Document and code disagree | Lead |
| 7 | Declare `ondelete=` on every FK | A default reads as a decision | Lead |

**1, 2 and 4 block the 19 Aug migration outright.** 3 already has agreement and needs only recording. 5, 6 and 7 are within the Lead's authority.

---

## F. Order of work before 19 Aug

1. **18 Aug meeting**: vote items 1, 2 and 4; record item 3.
2. **Align the models** so the code catches up to the ERD. Change the model first, then autogenerate — never generate first and patch the migration afterwards.
3. **Task #15, `MILESTONE`**, is scheduled 23–26 Aug, after the first migration. So **the first migration will not contain `MILESTONE`**; a second one adds it.
4. **`FOLDER` and `INGESTION_RUN` have no owner.** Assign them on 18 Aug.
5. Only then `alembic revision --autogenerate`, and **read the generated file line by line** before running it.

> **Do not use the migration to paper over a gap in the models.** autogenerate cannot detect a rename: `page_number` → `page_start` reads to it as one column dropped and another added, and the data goes with it. Renames have to be done in the models, or written by hand as `op.alter_column(..., new_column_name=...)`.

---

## Appendix — how this was produced

The code side is introspected from live metadata, not read off the source:

```bash
cd apps/api
uv run python -c "
import app.models
from sqlmodel import SQLModel
for name in sorted(SQLModel.metadata.tables):
    t = SQLModel.metadata.tables[name]
    print(name, [c.name for c in t.columns])
"
```

The ERD side is parsed out of `erd.mmd` with a regex over the entity blocks. The two are set-diffed, with the known renames (`storage_key`/`storage_path`, `page_start`/`page_number`) listed separately so they are not double-counted as one missing and one extra column.

**Why it is done this way**: on 15 Aug the ERD was rewritten from the meeting minutes instead of being diffed against the ratified version, and eight approved fields were dropped. `README.md` in this directory now says to diff field by field against the ratified one. This file is that diff.

Regenerate it whenever the models change. **A stale diff is worse than none**, because it will be trusted.
