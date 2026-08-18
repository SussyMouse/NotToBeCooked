# Code vs ERD — field-by-field diff, 17 Aug 2026 · re-run 19 Aug 2026

> **Third pass, 19 August 2026 — after the 18 August meeting.** Sections E and F are
> now outcomes rather than open questions. **Six of the nine entities are byte-exact
> against the diagram**; every one of section F's eleven live items is closed, and the
> only column-level differences left are the two blocked on AI-2. The 17 August
> figures are kept below as the before-picture, not because they are current.

**What was compared**

- **ERD of record**: `docs/erd/erd.mmd` at `origin/dev`. Nine entities. Ratified 27 Jul, amended 4 Aug (CR-23) and 15 Aug (CR-24 → CR-27), handed in 16 Aug.
- **Code**: `origin/yong-zhou` at `e03d737`. Taken by **introspecting `SQLModel.metadata`** in the `apps/api` virtualenv after importing `app.models` — not read off the source and summarised. The six `app/schemas/*.py` files are byte-identical on `dev`, `ck`, `bao-sheng` and `yong-zhou`, so there is only one version of the schema to compare.

**Why now**: the first migration lands 19 Aug. `autogenerate` follows the **code**, not the diagram. The first migration is the foundation of the database; changing it afterwards means either dropping the database or writing a second migration to undo the first.

**Second pass, 17 Aug evening.** The first pass compared column *names*. This pass also compares column types against the PostgreSQL dialect, nullability, enum value sets, and unique constraints — and adds section F, which sorts every difference by whether the 18 Aug meeting actually decides it. Six differences below were found only in the second pass and are marked **[2nd]**.

---

## Totals — 17 Aug, before the meeting

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
| Type mismatches | 2 — `FILE.size_bytes`, `FILE.uploaded_at` **[2nd]** |
| Enum value sets that disagree | 1 — `FileStatus` **[2nd]** |
| Unique constraints in the ERD, absent in code | 1 — `FILE.storage_key UK` **[2nd]** |
| Nullability that contradicts the ERD or itself | 3 **[2nd]** |
| **Differences the 18 Aug agenda does not decide** | **12 — see section F** |

> 28 of the 37 missing columns belong to the three absent tables. **The remaining 9 are spread across four tables that do exist, and those are the ones a migration will freeze in place without anyone noticing.**

## Totals — 19 Aug, after the meeting and `0319f05` / `f7160e5`

| | 17 Aug | 19 Aug |
|---|---|---|
| **Entities byte-exact against the diagram** | 0 | **6 of 9** — `USER`, `COURSE`, `CONVERSATION`, `MESSAGE`, and `FILE` / `CHUNK` but for one column each |
| Entities with no table at all | 3 | 3 — `FOLDER`, `INGESTION_RUN` (AI-2, D5), `MILESTONE` (r42, by design) |
| Tables with no entity | 1 | **0** — `conversationcourselink` dropped by D1 |
| **Columns missing from the code, excluding the 3 absent tables** | **9** | **2** — `FILE.folder_id`, `CHUNK.ingestion_run_id`. Both are one line, both wait on AI-2 |
| Columns only in the code | 4 | **1** — `FILE.course_id`, which is the placeholder `folder_id` replaces |
| Renames outstanding | 2 | **0** — `page_start` and `storage_key` both landed in the models, so `autogenerate` never sees a rename |
| Type mismatches | 2 | **0** — `size_bytes` is `BIGINT`, `uploaded_at` is `TIMESTAMP WITH TIME ZONE` |
| Enum value sets that disagree | 1 | **0** — `FileStatus` is `uploaded, processing, ready, failed` |
| Unique constraints in the ERD, absent in code | 1 | **0** — `FILE.storage_key` is unique |
| Nullability contradicting the ERD or itself | 3 | **0** — `conversation_id`, `embedding` and all six `created_at` are NOT NULL |
| Foreign keys declaring `ON DELETE` | 0 of 7 | **7 of 7.** Six CASCADE, one RESTRICT (`MESSAGE.scope_course_id`) |
| Differences the agenda did not decide | 12 | **1** — `MILESTONE`, deliberately in migration 2 |

**The number that matters is the second row of the fourth block: two.** Everything a
migration could freeze wrongly is fixed. What is left is not drift, it is two people's
work that has not arrived.

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
| **Renamed** | `storage_key` → `storage_path`, and the ERD's `UK` is not carried over **[2nd]** |
| **Type** | `uploaded_at` is `TIMESTAMP WITHOUT TIME ZONE` **[2nd]** · `size_bytes` is `INTEGER` |
| **Enum** | `FileStatus` has 3 values, the ERD has 4 **[2nd]** |

`course_id` versus `folder_id` is not one column more and one column less — it is **a different ownership structure**. The ERD says *"course is derived through the folder, not stored again"*. The code attaches a file to a course directly.

**Both work; only one can be built.** Whichever is chosen also decides where `CHUNK.course_id` gets its value.

`sha256` is the column from finding R7 — kept, but deliberately **not** UNIQUE, because two users may upload the same PDF. The code does not have the column at all.

**`storage_key` lost a constraint as well as a name.** The ERD marks it `UK`; the code's `storage_path` has `unique=False`. Two rows may therefore claim the same object-store key. The rename direction is already settled — the supersession table in `KNOWN_ISSUES.md` reads *`FILE.storage_path` → `FILE.storage_key`, "Object-store key, not a filesystem path"* — but nothing schedules it.

**`uploaded_at` is the only naive timestamp in the schema.** Seven of the eight `*_at` columns compile to `TIMESTAMP WITH TIME ZONE`; this one does not. `KNOWN_ISSUES.md` states the rule outright: *"`datetime` is `timestamptz` throughout. A system whose citations must survive a re-index cannot store naive timestamps."*

**`FileStatus` is missing `uploaded`.** The ERD says `uploaded, processing, ready, failed`; the code enum is `processing, ready, failed`. Upload and ingestion are separate endpoints — `POST /files` then `POST /files/{file_id}/ingest` — so a file that has been stored but not yet queued has no state to sit in, and has to be mislabelled `processing`. F2's file browser renders this column.

**`category` is already superseded.** The same supersession table reads *`FILE.category` → `FOLDER` entity, "a free-text label became a real entity"*. If decision 1 goes to the ERD, `category` is dead weight, but no agenda item says to drop it.

### B2 `CHUNK` — ERD 13 columns, code 11

| | |
|---|---|
| **Missing** | `ingestion_run_id` · `course_id` |
| **Renamed** | `page_start` → `page_number` |
| **Nullability** | `embedding` is nullable **[2nd]** |

**`course_id` is the most expensive column on this list.** Its ERD annotation reads *"denormalised, this is the filter in front of the HNSW scan"*. Without it, filtering by course requires joining `chunk → file → course`, and that join has to run in front of the vector scan.

Its absence also empties finding **R4**, which is about `ingestion_run_id`, `file_id` and `course_id` being able to contradict one another. Two of those three columns do not exist yet, so there is nothing to make consistent.

`page_start` was renamed on 16 Aug (finding R12). **The code has not followed, in six places**: `schemas/chunk.py:44` and `:64`, `schemas/rag.py:59`, `db/vector_ops.py:136` and `:217`, and four references in `services/prompt.py:87-92`.

The ingestion code is a separate matter and cuts the other way. On `dev` there is no `create_chunk()` at all — the chunk dicts are built inline inside `main()`, and they use `page_number`. On `bao-sheng`, `create_chunk()` exists as a real function and **already emits `page_start`**, matching the ERD. So the ingestion code is ahead of the models here, not behind them.

**`embedding` is nullable**, with nothing preventing a chunk from being stored without one. Such a chunk is invisible to vector search but still visible to the keyword half of hybrid search, so it returns from one path and not the other.

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
| **Nullability** | `conversation_id` is nullable **[2nd]** |

- **`scope_course_id`** — added by CR-24, `NOT NULL`, and the subject of the CASCADE-versus-RESTRICT decision recorded as R3. **It does not exist in the code, so that decision currently has nothing to attach to.**
- **`conversation_id` is nullable**, so a message can exist that belongs to no conversation. Every read path reaches messages through a conversation, which means such a row is unreachable rather than merely wrong — it consumes storage and appears in no transcript.
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

## D. Types, nullability, constraints

**Types must be compiled against the PostgreSQL dialect to be read at all.** Bare `str(column.type)` renders `UUID` as `CHAR(32)` and every timestamp as `DATETIME`, which produces seventeen mismatches that do not exist. The first pass of this section reported one of its ticks on that basis and got it wrong — corrected below.

| Check | Result |
|---|---|
| `uuid` renders as PostgreSQL `UUID` | ✅ all 12 |
| `timestamptz` renders as `TIMESTAMP WITH TIME ZONE` | ⚠️ **7 of 8** — `FILE.uploaded_at` is `WITHOUT TIME ZONE` **[2nd]** |
| `enum status` is a real PG enum, `filestatus` | ✅ type — ⚠️ **value set is short one member** **[2nd]** |
| `enum role` is a real PG enum, `chatrole` | ✅ `user, assistant`, matches |
| `text` / `string` render as `VARCHAR` with no length | ✅ equivalent to `text` in PostgreSQL |
| `vector` renders as `VECTOR(1024)` | ✅ (dimension below) |

**Mismatches:**

| Column | ERD | Code |
|---|---|---|
| `FILE.size_bytes` | `bigint` | `INTEGER` |
| `FILE.uploaded_at` | `timestamptz` | `TIMESTAMP WITHOUT TIME ZONE` **[2nd]** |
| `FILE.status` values | `uploaded, processing, ready, failed` | `processing, ready, failed` **[2nd]** |

**Nullability [2nd].** The ERD annotates nullability only in prose, so most of this is the code disagreeing with itself rather than with the diagram:

| Column | State | Why it matters |
|---|---|---|
| `message.conversation_id` | nullable | An orphan message is reachable by no read path |
| `chunk.embedding` | nullable | Returns from keyword search, never from vector search |
| `created_at` | nullable on `user`, `course`, `conversation`, `message`; **NOT NULL** on `chunk`, `file` | One concept, two rules. The nullable four rely on a Python-side default, so an insert outside the ORM writes `NULL` |

**Unique constraints [2nd].** The code declares exactly one: `ix_user_email`, unique. The ERD marks `FILE.storage_key` as `UK` and the code does not carry it. `KNOWN_ISSUES.md` additionally has **R17** `UNIQUE (user_id, code, year, sem)` and **R18** `UNIQUE (ingestion_run_id, chunk_index)` open against the first migration; neither exists yet.

`INTEGER` caps at roughly 2.1 GB. Course material is unlikely ever to reach it, but **changing it now is free and changing it after there is data means an `ALTER`**.

**One thing to confirm:** `chunk.embedding` is `VECTOR(1024)`, and `EMBEDDINGS_DIM = 1024` is **hardcoded** at `app/schemas/chunk.py:12`, duplicating `app/core/config.py:29`. The first migration should reference `settings.EMBEDDINGS_DIM` rather than becoming a third copy.

1024 is confirmed as final, but it is still **CR-28** and needs 18 Aug. The ERD still records 1536.

---

## E. What 18 Aug decided — all seven, and where each one landed

| # | Decision | Outcome | Landed in |
|---|---|---|---|
| 1 | **Which `CONVERSATION` model** — the ERD's home course, or the code's user + many-to-many | **The ERD** (D1, option A). `Conversation.user_id` and `ConversationCourseLink` both removed | `schemas/chat.py`, `routers/chat.py` — ownership now joins through `Course` |
| 2 | **Does `FILE` hang off `folder` or `course`** | **`folder`** (D1, option A) | `schemas/file.py` carries `course_id` as a placeholder with a `TODO(r41)`; the FK cannot point at a table with no model |
| 3 | **CR-28, embeddings at 1024** | **Approved** (D3). Model runs locally | Code was already `VECTOR(1024)`; the **diagram** was the stale side and now says 1024 |
| 4 | **`MESSAGE.scope_course_id` + RESTRICT** (R3 re-vote) | **All three columns kept, RESTRICT carried** (D2). R13 was taken first and declined, so this was a real vote | `schemas/chat.py` — `ondelete="RESTRICT"` |
| 5 | `FILE.size_bytes` → bigint | **Passed** | `sa_column=Column(BigInteger, ...)`, verified as `BIGINT` |
| 6 | Add `USER.display_name` to the ERD | **Passed** | `erd.mmd` — `USER` is now byte-exact against the code |
| 7 | Declare `ondelete=` on every FK | **Passed** | **7 of 7 declared.** Six CASCADE, one RESTRICT |

**Item 7 was the one at risk of passing without content.** It was read out as a
principle, and a principle does not write a value — so the values were chosen
explicitly: CASCADE everywhere the child has no meaning without its parent, RESTRICT
on the single column whose whole purpose is to preserve history.

**Four more FKs arrive with AI-2's two models** (`FOLDER.course_id`,
`FOLDER.parent_folder_id`, `FILE.folder_id`, `INGESTION_RUN.file_id`, plus
`CHUNK.ingestion_run_id`). Item 7 binds those too. Saying "seven foreign keys" stopped
being accurate the night D1 and D5 passed.

---

## F. The twelve the agenda did not decide — eleven closed, one by design

The agenda's own argument for deciding items 1, 2 and 4 is that **`autogenerate` follows the code, not the ERD, so not voting is a vote for what the code already does.** That argument applies word for word to everything below, and nothing below was put to anyone.

None of these needs a vote. Each is either already settled in a ratified document and never scheduled, or the ERD states a value the code simply has not adopted. **They are execution, not decisions** — which is exactly why they are easy to lose.

| # | Difference | Status of the decision | Cost of shipping migration 1 without it |
|---|---|---|---|
| 1 | `CHUNK.course_id` absent | ERD, annotated as the HNSW pre-filter | Every course-scoped vector search needs a 3-table join in front of the scan. Also leaves R4 with nothing to enforce |
| 2 | `FILE.storage_path` → `storage_key`, `UK` lost | **Already settled** in the `KNOWN_ISSUES.md` supersession table | A rename after there is data, plus duplicate object-store keys until the constraint arrives |
| 3 | `FILE.uploaded_at` naive | **Already stated as a rule**: *"`datetime` is `timestamptz` throughout"* | Citation timestamps that cannot survive a re-index across zones. An `ALTER` with a `USING` clause later |
| 4 | `FileStatus` missing `uploaded` | ERD value set | A stored-but-unqueued file must be mislabelled `processing`. Enum changes in PostgreSQL are cheap to add but the wrong data is already written |
| 5 | `CHUNK.page_number` → `page_start` | Finding R12, *"Fixed in diagram"* | `autogenerate` reads a rename as a drop plus an add, and the data goes with it |
| 6 | `FILE.sha256` absent | Finding R7 kept the column, removed only its UNIQUE | No duplicate detection |
| 7 | `FILE.indexed_at` absent | ERD, no finding against it | No way to tell a stored file from an indexed one without joining `INGESTION_RUN` |
| 8 | `FILE.category` still present | **Already superseded** by the `FOLDER` entity | A dead column in the foundation migration |
| 9 | `message.conversation_id` nullable | Neither document states it | Orphan messages, unreachable by any read path |
| 10 | `chunk.embedding` nullable | Neither document states it | A chunk that answers keyword search and never vector search |
| 11 | `created_at` nullable on 4 tables, NOT NULL on 2 | Neither document states it | Inconsistency frozen into the foundation |
| 12 | `MILESTONE` has no table | Scheduled — Gantt **r42**, 23–26 Aug | None: it is deliberately in migration 2. Listed so it is not mistaken for an oversight |

**Items 2, 3 and 8 are the uncomfortable ones.** All three were decided in a ratified document, and all three were then left out of every schedule. Nobody disagreed with them; they simply had no owner.

Seven further findings are already bucketed as **"Open — first migration"** in `KNOWN_ISSUES.md` — **R4, R5, R8, R17, R18, R19, R20**. That bucket is Gantt **r41**, 19–22 Aug, AI-3. They are scheduled, but they are scheduled inside the same four days as the migration itself, so they are the first thing that gets dropped if those days run short.

**Recommended handling: none of section F goes on the 18 Aug agenda.** Six decisions already fill the night, and adding twelve non-decisions would push the four that block 19 Aug down the page. Report the existence of this section on the night, in one sentence, and do the work inside r41.

### Closed 19 Aug — `0319f05` and `f7160e5`

The recommendation above was followed: the section was reported in one sentence on the
night and the work was done in the same pass as the model alignment, before
`autogenerate` was ever run.

| # | Difference | State | Verified as |
|---|---|---|---|
| 1 | `CHUNK.course_id` absent | ✅ added | `course_id UUID NOT NULL -> course.id CASCADE`, commented as the HNSW pre-filter |
| 2 | `storage_key`, `UK` lost | ✅ both | `storage_key VARCHAR unique=True` |
| 3 | `FILE.uploaded_at` naive | ✅ fixed | `TIMESTAMP WITH TIME ZONE` |
| 4 | `FileStatus` missing `uploaded` | ✅ restored | `['uploaded', 'processing', 'ready', 'failed']` |
| 5 | `page_number` → `page_start` | ✅ renamed in the models | `Chunk` and `ChunkCreate` both. `autogenerate` will never see a rename |
| 6 | `FILE.sha256` absent | ✅ added | nullable, **not** unique — finding R7 |
| 7 | `FILE.indexed_at` absent | ✅ added | nullable `timestamptz` |
| 8 | `FILE.category` still present | ✅ removed | gone from `File` and `FileRead` |
| 9 | `message.conversation_id` nullable | ✅ NOT NULL | |
| 10 | `chunk.embedding` nullable | ✅ NOT NULL | `Mapped[list[float]]`, `VECTOR(1024)` |
| 11 | `created_at` nullable on 4 tables | ✅ NOT NULL on all 6 | one rule, six tables |
| 12 | `MILESTONE` has no table | ⬜ **still open, by design** | Gantt **r42**, 23–26 Aug. Migration 2 |

**Items 2, 3 and 8 were called "the uncomfortable ones" above** — decided in a ratified
document, then left out of every schedule. They are the reason this section exists, and
they are closed. The lesson worth keeping is not that they were fixed; it is that
**being ratified was not enough to get them done — they needed a line in a diff.**

**What is genuinely still open is not in this section.** It is the seven constraint and
index findings bucketed as *Open — first migration* in `KNOWN_ISSUES.md`: **R4, R5, R8,
R17, R18, R19, R20**. The code declares exactly two unique constraints today
(`user.email`, `file.storage_key`); R17 and R18 are neither of them.

---

## G. Order of work before 19 Aug

1. ✅ **18 Aug meeting**: items 1, 2 and 4 voted; item 3 recorded. All ten decisions carried on the recommendation.
2. ✅ **Align the models** so the code catches up to the ERD. Change the model first, then autogenerate — never generate first and patch the migration afterwards. **Work section F in the same pass** — the models are being edited anyway, and every item there is a one-line change to a model file. *Done as `0319f05` + `f7160e5`; section F closed eleven of twelve.*
3. ⬜ **Task #15, `MILESTONE`**, is scheduled 23–26 Aug, after the first migration. So **the first migration will not contain `MILESTONE`**; a second one adds it. *Unchanged.*
4. ⚠️ **`FOLDER` and `INGESTION_RUN` have no owner.** Assign them on 18 Aug. *Assigned by D5 — both to AI-2 after `INGESTION_RUN` was reassigned from AI-1. **Neither appears in any Gantt row.** Seventeen columns across two models are now owned but unscheduled.*
5. ⬜ Only then `alembic revision --autogenerate`, and **read the generated file line by line** before running it.

**The migration now waits on exactly one thing: AI-2's two models.** Everything else on
this list is either done or deliberately deferred to migration 2. When the models land,
the sequence is `docker compose down -v` → `up -d db` → `revision --autogenerate` →
read it → `upgrade head`. The volume is dropped rather than stamped because the dev
database holds six of the seven tables and `alembic stamp head` would record a schema
that does not exist, stranding `chunk` permanently. The team agreed to the drop; there
is no data worth keeping.

> **Do not use the migration to paper over a gap in the models.** autogenerate cannot detect a rename: `page_number` → `page_start` reads to it as one column dropped and another added, and the data goes with it. Renames have to be done in the models, or written by hand as `op.alter_column(..., new_column_name=...)`.

---

## Appendix — how this was produced

The code side is introspected from live metadata, not read off the source:

```bash
cd apps/api
uv run python -c "
import app.models
from sqlmodel import SQLModel
from sqlalchemy.dialects import postgresql
pg = postgresql.dialect()
for name in sorted(SQLModel.metadata.tables):
    for c in SQLModel.metadata.tables[name].columns:
        print(f'{name}.{c.name}', c.type.compile(pg), 'null=' + str(c.nullable))
"
```

**`c.type.compile(pg)` is not optional.** Without a dialect, SQLAlchemy renders types generically: `UUID` becomes `CHAR(32)` and every `timestamptz` becomes `DATETIME`. Diffing that output against the ERD produces seventeen mismatches, all of them artefacts. Compile against `postgresql.dialect()` and the real count is two.

The ERD side is parsed out of `erd.mmd` with a regex over the entity blocks. The two are set-diffed, with the known renames (`storage_key`/`storage_path`, `page_start`/`page_number`) listed separately so they are not double-counted as one missing and one extra column.

**Why it is done this way**: on 15 Aug the ERD was rewritten from the meeting minutes instead of being diffed against the ratified version, and eight approved fields were dropped. `README.md` in this directory now says to diff field by field against the ratified one. This file is that diff.

Regenerate it whenever the models change. **A stale diff is worse than none**, because it will be trusted.
