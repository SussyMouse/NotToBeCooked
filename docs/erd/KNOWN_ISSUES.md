# NotToBeCooked — ERD Known Issues

**Accompanies:** `NotToBeCooked_ERD_2026-08-16.mmd` / `.png`
**Date:** 16 August 2026
**Author:** Lim Yong Zhou (AI-3, Project Lead)

The ERD submitted alongside this note went through two independent reviews after
the 15 August meeting.

The first returned ten findings. Four were corrected in the submitted diagram,
one is closed, and five are open and listed below with the reason and the
schedule.

The second proposed a thirteen-table redesign. Four of its recommendations had
already been applied by the first pass, six restated findings already on this
list, and eleven were new. Two of its new recommendations contradict decisions
taken at the 15 August meeting. All of it is recorded in Part B.

Nothing on this list is unknown to the team. It is published rather than
silently carried so that the diagram and the team's understanding of it stay
the same document.

---

# Part A — first review

## Corrected in the submitted diagram

### R2 — `MESSAGE.course_id` renamed `scope_course_id`

`CONVERSATION.course_id` is the conversation's home course. `MESSAGE.course_id`
was the retrieval scope of one single turn. Two different meanings sharing one
column name, one join away from each other.

The rename is free right now because the column has not been written yet. After
it ships it costs a migration.

### R3 — `ON DELETE CASCADE` downgraded to `ON DELETE RESTRICT`

The meeting voted CASCADE on the reasoning that deleting a course should take
that course's questions with it. That reasoning holds only while a conversation
and its turns share one course.

They do not have to. A conversation whose home course is CS201 can contain a
turn scoped to CS210, because @-mentions are allowed to cross courses (US-12).
Under CASCADE, deleting CS210 deletes that turn out of the middle of a CS201
conversation the user never asked to touch — and it does so silently, while
`scope_snapshot` on that same row exists specifically to preserve what was
searched.

RESTRICT was chosen over `SET NULL` because `SET NULL` would require making the
column nullable, and sub-decision 2 of item 03 voted it NOT NULL for a separate
and still-valid reason.

**This reverses a decision taken at the 15 August meeting.** It is flagged to
the team and goes back to a vote on 18 August. The diagram shows RESTRICT
because shipping a diagram with a known hole in it is worse than shipping one
whose open question is named.

### R7 — `FILE.sha256` UNIQUE constraint removed

Files belong to a user: `FILE → FOLDER → COURSE → USER`. A global UNIQUE on the
content checksum means the system stores any given PDF exactly once across all
users, and the second student to upload the same lecture slides is rejected with
a duplicate-key error.

The constraint was carried over from the earlier data dictionary without being
re-examined against the ownership chain. Removed. Duplicate detection is still
possible on the checksum; it just has to be scoped, not global.

### R9 — `FOLDER` gains `parent_folder_id`

The UI ships flat, which was the decision at the meeting and is not being
reversed. The column is added now because FOLDER has not been built yet, so it
costs one line today and a migration plus a backfill later.

Nothing reads the column in v1. `is_root` continues to identify the hidden root.

The FOLDER-to-FOLDER edge is deliberately **not** drawn on the diagram: the
layout engine routes a self-reference as a long tail that pushes the
FOLDER-to-FILE edge across CONVERSATION. The column carries the meaning.

---

## Closed

### R1 — `CONVERSATION` carried both `user_id` and `course_id`

`COURSE` already has `user_id`, so a conversation's owner is reachable through
its course. Storing it again allows a row where the conversation's owner and the
course's owner are different people. Nothing enforces that they match.

**Closed rather than deferred.** The 27 July ratified ERD never had
`CONVERSATION.user_id` — the draft of this revision introduced it, which is why
both reviews found it. Removing it restores the ratified shape and is not a
decision anyone has to take.

One thing does remain: the ORM model on the `ck` branch carries the column. That
is now a code-vs-diagram mismatch to reconcile, not a schema question.

---

## Open — scheduled for 18 August

### R6 — `MESSAGE.mentioned_file_ids` is JSONB with no foreign key

The @-mention scope is stored as a JSON array of file IDs. The database cannot
check that those IDs exist, and deleting a file leaves the array pointing at
nothing.

This is intentional in v1 — the array is a frozen record of what the user asked
for at that moment, and a dangling ID is arguably the correct historical answer.
A junction table would enforce referential integrity and lose that property. The
trade is real and worth a decision rather than a default.

Separately: **folder-level @-mentions have no representation at all.** The array
holds file IDs. Mentioning a folder currently has to be expanded to files at
send time, which freezes the folder's contents as of that moment. This has never
been on an agenda.

### R10 — `MESSAGE` has no `sequence_no`

Turn order is currently implied by `created_at`. Two rows written inside the same
transaction can share a timestamp, and the conversation renders in an arbitrary
order. A monotonic integer per conversation removes the ambiguity.

Deferred: `ck` branch code.

---

## Open — folded into the first Alembic migration

These three are constraints and indexes. They do not appear on an ER diagram at
all; they appear in the migration that builds the schema. Listed here so the
diagram is not mistaken for the whole specification.

### R4 — `CHUNK` holds three independently-valid foreign keys

`ingestion_run_id`, `file_id` and `course_id` can each point at a legitimate row
while together describing something impossible: a chunk attributed to a run of a
file that belongs to a different course.

`file_id` and `course_id` are denormalised on purpose — a citation needs both
without a join, and `course_id` is the filter in front of the vector scan.
Keeping the denormalisation and enforcing consistency needs either a composite
foreign key or a trigger.

### R5 — Nothing filters the vector scan by embedding model

`INGESTION_RUN` records `embedding_model` and `embedding_dim`, which is what
makes an embedding-model swap possible without dropping the database. But two
models with the same output dimension produce vectors in different spaces, and
cosine similarity between them is meaningless — it returns a number, not an
answer.

Retrieval must therefore constrain to the active run's model, not merely to
`is_active`.

### R8 — `INGESTION_RUN.is_active` is a boolean with no uniqueness guarantee

The annotation says exactly one active run per file is visible to retrieval. A
boolean column cannot enforce that; two rows can both be true. The enforcement
is a partial unique index:

```sql
CREATE UNIQUE INDEX ix_ingestion_run_one_active
    ON ingestion_run (file_id) WHERE is_active;
```

---

## Not a defect

### R9b — Flat folder hierarchy

Raised as a gap; it is a decision. Nesting was scoped out for v1 deliberately.
The column added under R9 above is the cheap hedge, not a reversal.

---

# Part B — second review

The second review proposed replacing the nine entities with thirteen, adding
`EMBEDDING_PROFILE`, `MESSAGE_SCOPE_COURSE`, `MESSAGE_SCOPE_FILE` and
`MESSAGE_CITATION`, and removing the denormalised columns on `CHUNK`.

It was run against the pre-correction diagram, so four of its recommendations —
`FOLDER.parent_folder_id`, dropping the global `sha256` UNIQUE, separating home
course from retrieval scope by name, and not cascading a course delete into
message history — describe changes this submission already contains. Two
independent reviews converging on the same four is treated here as
corroboration, not as two separate findings.

## Applied to the submitted diagram

### R11 — `COURSE` gains `name`

`code` holds "CPC251". Nothing held "Artificial Intelligence". A course was not
displayable without a lookup table that does not exist.

### R12 — `CHUNK.page_number` renamed `page_start`

It sits next to `page_end` and a chunk may straddle a page break, so the pair
describes a range. The old name did not read as one half of a range.

Neither of these touches a decision that was voted on.

## Deferred to 18 August

### R13 — `MESSAGE_SCOPE_COURSE` junction table

The strongest item in the second review. A single `scope_course_id` cannot
express a turn scoped to two courses, which US-12 explicitly allows.

It also dissolves R3. With a junction table, deleting a course removes junction
rows and leaves the message intact — neither CASCADE nor RESTRICT has to be
chosen, because neither applies. **R3 and R13 are therefore a single vote, not
two.**

Cost: three tables, the ORM models on the `ck` branch, and a rewrite of the C4
scope-precedence contract. That is why it is a change request and not an edit.

### R14 — `MESSAGE_CITATION` table (accepted in part)

The proposal replaces the `citations` JSONB with a table carrying a `chunk_id`
foreign key.

Rejected as proposed: `citations` is a deliberately frozen snapshot. Re-indexing
deletes and recreates chunks, so a `chunk_id` foreign key would either block
re-indexing or point at nothing afterwards. The proposal half-recognises this
and adds `quote_snapshot` alongside, which means storing both representations.

Accepted in part: the review surfaced a real gap. The current `citations` JSONB
holds `file_id`, `course_id`, `page` and `quote` — **no `chunk_id`**. Provenance
stops at the file. Adding `chunk_id` as a field inside the existing JSONB
recovers the traceability at no structural cost. That is the counter-proposal
going to 18 August.

### R15 — `CONVERSATION.course_id` required

With R1 closed, `course_id` is the only ownership path and therefore mandatory.
A user cannot open a conversation before creating a course.

This is no longer hypothetical — it is the shape the submitted diagram has. It
is an onboarding constraint rather than a schema defect, and the options are a
default "Unsorted" course created at signup, or allowing a null `course_id` with
ownership carried some other way. 18 August.

### R16 — Soft delete on `COURSE` and `FILE`

`deleted_at timestamptz nullable` instead of a physical delete, to preserve
conversation history, citations and audit trail.

Related to R3 and R13: soft delete is a third answer to the same question.

## Folded into the first Alembic migration

- **R17** — `UNIQUE (user_id, code, year, sem)` on `COURSE`
- **R18** — `UNIQUE (ingestion_run_id, chunk_index)` on `CHUNK`
- **R19** — `is_active = true` implies `status = 'ready'`; an active run must not
  be a failed or in-progress one
- **R20** — the supporting index set: `COURSE(user_id)`, `FOLDER(course_id)`,
  `FOLDER(parent_folder_id)`, `FILE(folder_id)`, `FILE(sha256)` (non-unique, per
  R7), `INGESTION_RUN(file_id)`, `CHUNK(ingestion_run_id)`, plus the pgvector ANN
  index on `CHUNK.embedding`

## Declined for v1

### R21 — `EMBEDDING_PROFILE` as its own entity

Proposed to replace `embedding_model` and `embedding_dim` on `INGESTION_RUN`
with a foreign key to a model registry.

The correctness problem it targets is real and is already recorded as R5:
vectors from two models are incomparable even at equal dimension, so retrieval
must constrain to the active run's model. R5 fixes that at the query. A registry
table earns its keep once several models are in rotation; v1 runs one.

### R22 — `STORED_OBJECT` / `FILE` split for global deduplication

Separates the physical stored object (unique by checksum) from the logical file
a user sees, so two users can share one stored blob.

Correct, and the right shape if storage cost becomes a constraint. It is not one
at v1 scale, and it adds a table and a join to every file read.

## Contradicts a decision taken on 15 August

These two are recorded because they will return, not because they are open.

### R23 — remove `CHUNK.file_id` and `CHUNK.course_id`

Both are derivable through `INGESTION_RUN → FILE → FOLDER → COURSE`, and the
second review is right that storing them again is what makes R4 possible.

They are denormalised deliberately. `course_id` is the filter applied *before*
the vector scan; deriving it would put a four-table join in front of every
retrieval query. `file_id` is what a citation needs without a join. Meeting item
04 confirmed both.

The review's own closing section allows denormalisation for performance provided
the redundancy is constrained. That is R4, and R4 is scheduled. The columns stay.

### R24 — a full folder tree

Nesting was scoped out of v1 at meeting item 04. `parent_folder_id` was added
under R9 as the forward-compatible hedge; the UI still ships flat.

---

# Part C — field restoration

Not a review finding. A defect in how this revision was produced.

The revised diagram was written from the meeting minutes rather than edited on
top of the ratified 27 July / CR-23 ERD. Checking it field-by-field against the
ratified version afterwards showed **eight ratified fields had been dropped** and
one unratified field added. All nine are corrected in the submitted diagram.

| Entity | Restored |
|---|---|
| `MILESTONE` | `position`, `description`, `status`, `file_ids`, `created_at`, `updated_at` |
| `CHUNK` | `token_count`, `created_at` |
| `COURSE` | `status` |
| `FILE` | `filename` — reinstating the Project Lead call of 3 Aug 2026, which chose `filename` over `name`. The interim `display_name` was a third spelling no decision authorised |
| `CONVERSATION` | `user_id` **removed** — see R1 |

`MILESTONE.status` and `file_ids` matter most: US-16 computes course completion by
counting `status = completed`, and US-17 displays a milestone's attached files
from `file_ids`. F4 is a MUST by team vote. Neither story is buildable without
them, and the omission would not have surfaced until F4 was started in late
September.

Four differences from the ratified ERD are deliberate and are recorded as
supersessions rather than drops:

| Ratified | Now | Why |
|---|---|---|
| `FILE.category` | `FOLDER` entity | CR-25 — a free-text label became a real entity |
| `FILE.course_id` | `FILE.folder_id` | CR-25 — course is derived through the folder |
| `FILE.storage_path` | `FILE.storage_key` | Object-store key, not a filesystem path |
| `USER.password_hash` | `USER.hashed_password` | The code already uses it (`schemas/user.py`, `routers/auth.py`). Same reasoning as the `filename` call, resolved the other way because here the code is the older commitment |

`datetime` is `timestamptz` throughout. A system whose citations must survive a
re-index cannot store naive timestamps.

---

## Summary

| # | Finding | Status |
|---|---------|--------|
| — | Eight ratified fields dropped in drafting | **Restored — Part C** |
| R2 | `MESSAGE.course_id` → `scope_course_id` | Fixed in diagram |
| R3 | `CASCADE` → `RESTRICT` | Fixed in diagram, **reopens a 15 Aug vote** |
| R7 | `FILE.sha256` global UNIQUE | Fixed in diagram |
| R9 | `FOLDER.parent_folder_id` | Fixed in diagram |
| R11 | `COURSE` had no `name` | Fixed in diagram |
| R12 | `page_number` → `page_start` | Fixed in diagram |
| R13 | `MESSAGE_SCOPE_COURSE` junction | Open — 18 Aug, **votes together with R3** |
| R14 | `citations` JSONB carries no `chunk_id` | Open — 18 Aug, counter-proposal |
| R1 | `CONVERSATION.user_id` redundant | **Closed — the column was never ratified; removed** |
| R15 | Required `course_id` blocks first-run onboarding | Open — 18 Aug |
| R6 | `mentioned_file_ids` has no FK; folders unrepresented | Open — 18 Aug |
| R10 | `MESSAGE` has no `sequence_no` | Open — 18 Aug |
| R16 | Soft delete on `COURSE` / `FILE` | Open — 18 Aug |
| R4 | `CHUNK` FKs can contradict each other | Open — first migration |
| R5 | Vector scan not filtered by embedding model | Open — first migration |
| R8 | `is_active` needs a partial unique index | Open — first migration |
| R17 | `UNIQUE (user_id, code, year, sem)` | Open — first migration |
| R18 | `UNIQUE (ingestion_run_id, chunk_index)` | Open — first migration |
| R19 | `is_active` implies `status = 'ready'` | Open — first migration |
| R20 | Supporting index set | Open — first migration |
| R21 | `EMBEDDING_PROFILE` entity | Declined for v1 — see R5 |
| R22 | `STORED_OBJECT` split | Declined for v1 |
| R23 | Remove `CHUNK.file_id` / `course_id` | Declined — item 04, see R4 |
| R24 | Full folder tree | Declined — item 04, see R9 |
