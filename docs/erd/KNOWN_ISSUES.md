# NotToBeCooked — ERD Known Issues

**Accompanies:** `NotToBeCooked_ERD_2026-08-16.mmd` / `.png`
**Date:** 16 August 2026 · **statuses landed 19 August 2026**
**Author:** Lim Yong Zhou (AI-3, Project Lead)

> **Update, 19 August 2026.** The 18 August meeting settled every finding this file
> had marked *Open — 18 August*: **R3, R13, R14, R15, R16** were decided, and **R6**
> and **R10** were not reached and therefore proceed on the recommendation printed
> here, as the agenda said they would. Each finding below carries its outcome inline;
> **Part D** lists the decisions in one place. Nothing was left in the state "open".

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

**Closed 18 August — Decision 2 carried RESTRICT.** The 15 August CASCADE vote is
superseded rather than merely flagged, and `MESSAGE.scope_course_id` now declares
`ondelete="RESTRICT"` in `app/schemas/chat.py`. R13 was taken first, as the agenda
required, and declined — so the junction table did not dissolve this question and
the vote was a real one.

**The consequence R16 leaves behind is recorded under R16.** RESTRICT plus no soft
delete means a course used in any turn cannot be deleted at all.

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

## Was open for 18 August — neither was reached, both proceed on the recommendation

The agenda's standing rule is that an item not decided on the night proceeds on the
recommendation printed for it and is recorded that way. These two are the only
findings that rule was actually exercised on.

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

**18 August — not reached; proceeds on the recommendation.** The column stays JSONB
with no foreign key for v1, which is what the code already does. The frozen-record
property is the reason, not inertia: a dangling file ID is the historically correct
answer to "what did the user ask for".

**25 August — the second half is decided. Option A: the freeze is the point.**
Mentioning a folder expands to that folder's file list at send time, and the array
keeps those IDs. Adding a file to the folder afterwards does not reach back into an
earlier turn.

The alternative was storing folder IDs and expanding at retrieval time, which would
mean "whatever is in this folder now". That reading is defensible on its own and
wrong next to the first half of R6: `mentioned_file_ids` would then hold two kinds
of time in one column, frozen for files and live for folders, with nothing in the
schema saying which a given row is.

**A does carry a condition, and it is not a database change.** A user who mentions
a folder is picking a container and getting a list, and the difference only shows up
later, when the list has gone stale. That has to be visible in the UI at the moment
of mention — it cannot live only in a column comment. Logged against F2.

### R10 — `MESSAGE` has no `sequence_no`

Turn order is currently implied by `created_at`, with nothing guaranteeing that two
rows of one conversation carry distinct values. A monotonic integer per conversation
would remove the ambiguity instead of relying on clock resolution. How much
ambiguity there actually is today was measured on 24 August — see below; it is less
than this entry originally asserted.

**18 August — deferred again, and this file previously contradicted itself on it.**
The body said "deferred"; the summary table at the foot said "Open — 18 Aug". The
body was right. R10 was never on the 18 August agenda in the first place, so there
was nothing to not-decide: turn order stays implied by `created_at` for v1.

**What deferring actually costs — measured 24 August, and it is smaller than this
entry used to claim.** The earlier wording said two rows written in one transaction
can share a timestamp, and that a user turn and its assistant turn are exactly that
pair. The second half does not hold for the code as written.

`created_at` is not `server_default=now()`; both rows call Python's
`datetime.now(UTC)` separately (`routers/rag.py:79` and `:181`), and the whole
generation block sits between them. Two calls with a single `sha256` between them
collided **0 times in 20,000**. Back-to-back with nothing in between they collide
83% of the time, which is the clock's resolution rather than our situation.

So the accepted defect is narrower: **turn order is safe while every writer stamps
its own row in Python.** It breaks the day someone switches the column to a server
default, because a transaction timestamp is identical for every row in the
transaction — and `routers/chat.py:99` orders by `created_at` alone, so the
conversation would then render arbitrarily. That is the thing to recognise in a bug
report, not a collision under the current code.

---

## Open — folded into the first Alembic migration

These three are constraints and indexes. They do not appear on an ER diagram at
all; they appear in the migration that builds the schema. Listed here so the
diagram is not mistaken for the whole specification.

**This heading is now historical for two of the three.** R4 closed on 26 August,
across r41 and r42 rather than one migration. R5 was reclassified on 22 August as
a retrieval-layer query predicate and never belonged in a migration at all; it is
open and assigned. Only R20 was ever finished where this heading says it would be.
The heading is kept rather than renamed so that older references to it still land.

### R4 — `CHUNK` holds three independently-valid foreign keys

`ingestion_run_id`, `file_id` and `course_id` can each point at a legitimate row
while together describing something impossible: a chunk attributed to a run of a
file that belongs to a different course.

`file_id` and `course_id` are denormalised on purpose — a citation needs both
without a join, and `course_id` is the filter in front of the vector scan.
Keeping the denormalisation and enforcing consistency needs either a composite
foreign key or a trigger.

**Closed 26 August, in two halves and two migrations.**

The first half shipped with r41 on 22 August: `CHUNK (ingestion_run_id, file_id)`
points at `INGESTION_RUN (id, file_id)`, so a chunk can no longer claim a run
belonging to a different file. That needed `uq_ingestion_run_id_file`, because
PostgreSQL will not accept those two columns as a foreign key target unless some
unique constraint covers exactly them — `id` being a primary key is not enough.

The second half could not be written the same way, and that is why it waited. The
agreement to enforce is between `CHUNK.course_id` and `CHUNK.file_id`, but a
composite foreign key must point at real columns on one table, and no table
carried both `file_id` and `course_id`. FILE reached its course through FOLDER.
There was nothing to point at.

**25 August meeting, Decision 02, option B — measured before the vote.** With
nothing enforcing it, this row went in against a file that lives under CSC3105:

```sql
-- this file is under CSC3105; course_id says CSC3110
INSERT INTO chunk(..., file_id, course_id, chunk_index, ...) VALUES (...);
 chunk_index |   content
-------------+--------------
           8 | wrong course
(1 row)
```

Three options were on the agenda: a trigger, denormalising `course_id` back onto
FILE, or leaving it to `processor.py` and writing that down with a date. B carried.
A trigger hides the logic somewhere neither code review nor `git log` shows it,
which matters more with three people than with thirty.

**Shipped as r42, 26 August (CR-31).** FILE regains `course_id`, and the
constraint becomes a chain rather than a single link:

```
CHUNK (file_id, course_id)   -> FILE   (id, course_id)
FILE  (folder_id, course_id) -> FOLDER (id, course_id)
```

FOLDER and FILE each carry `UNIQUE (id, course_id)` for the same reason
INGESTION_RUN carries `uq_ingestion_run_id_file`: to be a legal target. Neither
forbids anything new.

Verified by `check_r42.py`, eleven cells over `upgrade -> downgrade -> upgrade`.
Three of them are behavioural rather than structural: a file claiming a course
its folder is not in is rejected, a chunk disagreeing with its file is rejected,
and — the cell that matters most — a row where all three agree still goes in. A
constraint that blocks everything passes the first two.

**What this does not close.** The chain binds `course_id` to `file_id`, and r41
bound `file_id` to `ingestion_run_id`. Both links are enforced, so all three keys
now describe one consistent object. `processor.py` is no longer the only thing
standing between a mislabelled chunk and the database.

### R5 — Nothing filters the vector scan by embedding model

`INGESTION_RUN` records `embedding_model` and `embedding_dim`, which is what
makes an embedding-model swap possible without dropping the database. But two
models with the same output dimension produce vectors in different spaces, and
cosine similarity between them is meaningless — it returns a number, not an
answer.

Retrieval must therefore constrain to the active run's model, not merely to
`is_active`.

**25 August meeting, Decision 3 — assigned to AI-1.** R5 left r41 on 22 August
because it is a query condition, not a constraint, and it then sat in this file
as the only entry that was neither decided nor owned. It now has a name.

The work lands in `_vector_similarity_search`, which already takes an optional
`file_ids` filter; "only this run" is the same shape of change in the same place.

**Measured 25 August.** One file, two ingestion runs, two chunks each, one query
vector. The old run is `is_active = false`:

```
current _vector_similarity_search
  1. distance=0.0100  OLD RUN  chunk 0  (superseded-model)
  2. distance=0.0500  OLD RUN  chunk 1  (superseded-model)
  3. distance=0.1000  NEW RUN  chunk 0  (jinaai/jina-embeddings-v5-text-small)
  4. distance=0.1500  NEW RUN  chunk 1  (jinaai/jina-embeddings-v5-text-small)

with an is_active join
  1. distance=0.1000  NEW RUN  chunk 0  (jinaai/jina-embeddings-v5-text-small)
  2. distance=0.1500  NEW RUN  chunk 1  (jinaai/jina-embeddings-v5-text-small)
```

The model names in that output were **relabelled on 31 August**. The probe seeded
two runs with two different `embedding_model` values to show the effect; the
names originally written down were Gemini embedding models, which this project
does not use. The embedder is the local `settings.MODEL_TYPE` model run through
SentenceTransformer. `GEMINI_MODEL_NAME` is the generation LLM and has never been
the embedder. The distances are unchanged -- they were seeded, not computed.

The superseded chunks take rank 1 and 2 and eat two of the five `top_k` slots.
Nothing errors; the answer is simply built on text that was replaced.

`ix_ingestion_run_one_active` (r41, partial unique on `file_id WHERE is_active`)
guarantees at most one active run per file, so a join is enough within a file. It
is not enough across files: two active runs can still name different
`embedding_model` values. Whether to add that second filter now or when a second
model is actually in use is AI-1's call, to be recorded here either way.

`_full_text_search` has the same hole. Lexical ranking does not care which model
produced the vectors, but it does return chunks from superseded runs.

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

## Settled on 18 August

### R13 — `MESSAGE_SCOPE_COURSE` junction table

The strongest item in the second review. A single `scope_course_id` cannot
express a turn scoped to two courses, which US-12 explicitly allows.

It also dissolves R3. With a junction table, deleting a course removes junction
rows and leaves the message intact — neither CASCADE nor RESTRICT has to be
chosen, because neither applies. **R3 and R13 are therefore a single vote, not
two.**

Cost: three tables, the ORM models on the `ck` branch, and a rewrite of the C4
scope-precedence contract. That is why it is a change request and not an edit.

**Declined 18 August.** Not on the merits — the argument above still stands — but on
the cost landing four days before the first migration. `mentioned_file_ids` already
carries cross-course scope for the case US-12 actually describes (@-mentioning files
from another course), so the gap is narrower than the finding reads.

**Reopen condition, recorded so this is not re-argued from memory:** the first US-12
acceptance case that genuinely needs two courses ticked on one turn, with neither
expressible as an @-mention. Until then it stays declined.

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

**Accepted 18 August, then routed elsewhere by a Lead ruling the same night.** The
meeting carried "add `chunk_id` to the `citations` JSON". Writing it up against C4
showed that puts the id in the one place C4 forbids it, for the same reason this
finding rejects the foreign-key version: **a citation is a durable anchor, and a
chunk id does not survive a re-index.** A stale id in a citation is a broken
citation; the fix would have recreated the defect one layer down.

**Where it went instead:** `MESSAGE.scope_snapshot`, whose serialised shape is now
`ScopeSnapshot` in `app/schemas/rag.py` — `retrieved_chunk_ids` and `used_chunk_ids`
alongside the scope and the embedding model. A stale chunk id there is acceptable
because **nothing resolves against it**: the snapshot records what happened, it does
not point at anything that has to still exist.

Provenance is therefore chunk-level as the meeting intended, and `Citation` stays
anchored to file + page + quote. Recorded as an amendment rather than a silent edit
because the minutes say `citations`.

### R15 — `CONVERSATION.course_id` required

With R1 closed, `course_id` is the only ownership path and therefore mandatory.
A user cannot open a conversation before creating a course.

This is no longer hypothetical — it is the shape the submitted diagram has. It
is an onboarding constraint rather than a schema defect, and the options are a
default "Unsorted" course created at signup, or allowing a null `course_id` with
ownership carried some other way. 18 August.

**Accepted 18 August — the Unsorted course.** `POST /auth/register` now writes the
user row and one course row in the same transaction (`build_unsorted_course` in
`app/routers/auth.py`). `course_id` stays NOT NULL, so the ownership path stays
single, and first run is not a dead end.

Two details that are decisions rather than implementation:

- **`year` and `sem` are 0, not the calendar year.** They mark the row as a
  placeholder, and under R17's `UNIQUE (user_id, code, year, sem)` they guarantee
  an account holds exactly one Unsorted course however long it lives. A calendar
  year would have allowed one per year.
- **`status` is written as `"active"`.** `COURSE.status` is free text and its value
  set has never been defined — ratified 27 July, never specified since. This picks
  the obvious reading without claiming to settle it. **Still open, still unowned.**

### R16 — Soft delete on `COURSE` and `FILE`

`deleted_at timestamptz nullable` instead of a physical delete, to preserve
conversation history, citations and audit trail.

Related to R3 and R13: soft delete is a third answer to the same question.

**Declined 18 August.** v1 deletes physically. Reopen condition: the first time
someone deletes a course by mistake and asks for it back.

**The consequence, stated plainly because it was not part of the vote.** R3 carried
RESTRICT on `MESSAGE.scope_course_id`, and R16 removed the only other way a course
could leave the system. Together:

> **A course that has been the scope of even one turn cannot be deleted.** The
> database refuses the `DELETE`, and there is no `deleted_at` to fall back on.

So **v1 ships with no delete-course feature at all** — not as a cut item, as an
arithmetic result of two separate decisions. That is defensible for v1 (nothing is
lost, and history is exactly what RESTRICT is protecting), but it must be written
down, because the alternative is discovering it from a `ForeignKeyViolation` in a
demo. Three ways out exist when it matters: soft delete (R16, reopened), reparenting
the affected turns to a tombstone course, or `ON DELETE SET NULL` with a nullable
column — which sub-decision 2 of item 03 voted against for a still-valid reason.

## Folded into the first Alembic migration

R5 is **not** on this list, though the summary table carried it here until 22 Aug.
It is a query condition rather than a constraint; see its row for why.

- **R17** — `UNIQUE (user_id, code, year, sem)` on `COURSE` — **done 22 Aug**
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

### R26 — the ERD drew one of `CHUNK`'s three foreign keys

**Fixed 23 August.** `erd.mmd` carried a single relationship into `CHUNK`:

```
INGESTION_RUN ||--o{ CHUNK : "produced"
```

while the schema has three, each with `ON DELETE CASCADE`:

```
chunk_ingestion_run_id_fkey  -> ingestion_run    drawn
chunk_file_id_fkey           -> file             not drawn
chunk_course_id_fkey         -> course           not drawn
```

Both undrawn columns are annotated `FK` in the `CHUNK` block and described as
denormalised, which is why the gap survived the 16 August review: the columns
were visible, only the edges were missing. Denormalisation explains why a column
exists; it does not stop the column being a foreign key.

The reading it produced is wrong in a way that matters. Deleting a course looks
like it reaches `CHUNK` along `COURSE -> FOLDER -> FILE -> INGESTION_RUN -> CHUNK`,
four cascades deep, when there is also a direct edge. Anyone changing
`ON DELETE` at the `FILE` level to preserve chunks would find they are deleted
anyway, and nothing in the diagram would explain why.

Added:

```
FILE   ||--o{ CHUNK : "cited as"
COURSE ||--o{ CHUNK : "scopes"
```

`fk_chunk_run_file_agree` — R4's composite foreign key, added 22 August — points
at `INGESTION_RUN` like the first one and gets no separate edge; it is recorded
in the `file_id` annotation instead.

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

# Part D — the 18 August meeting

Ten decisions, **all carried on the recommendation printed in the agenda**. Recorded
here rather than only in the minutes because six of them change this file.

| Label | Decision | Outcome |
|---|---|---|
| **R13** | `MESSAGE_SCOPE_COURSE` junction table | **Declined.** Reopens on a US-12 acceptance case needing two courses on one turn |
| **R16** | Soft delete on `COURSE` / `FILE` | **Declined.** Reopens on the first mistaken delete someone wants back |
| **D1** | Which `CONVERSATION` and which `FILE` — diagram or code | **Option A: both follow the diagram.** Code aligned the same night |
| **D5** | Owners for `FOLDER` and `INGESTION_RUN` | `FOLDER` → **AI-2**; `INGESTION_RUN` → AI-1, **reassigned to AI-2 after the meeting** |
| **D2** | `MESSAGE`: keep all three columns, and RESTRICT | **All three kept, RESTRICT carried.** Closes R3 |
| **R14** | `citations` carries no `chunk_id` | **Accepted**, then routed to `scope_snapshot` by Lead ruling — see R14 |
| **R15** | Required `course_id` blocks first run | **Accepted.** Unsorted course created at signup |
| **D3** | CR-28 — embeddings at 1024, model runs locally | **Approved.** The diagram recorded 1536 until now |
| **D4** | CR-29 — keep `verify.yml` | **Approved** |
| **D6** | C6-D1 / C6-D2 / C6-D3 | **b / b / a** |

The Lead's six calls were read out and all six passed. Two of them land in this
file's territory: **`FILE.size_bytes` → `bigint`** and **`USER.display_name` added to
the diagram** — the code had that column from the first commit and the diagram was
the side that was wrong.

## What this meeting did not settle

Three things are still unowned, and none of them was on the agenda:

1. **`COURSE.status` has no value set.** Ratified 27 July; never specified. R15's
   implementation writes `"active"` because it had to write something.
2. **`FILE.storage_key` is marked `UK` on the diagram and has no unique constraint
   in the code.** Folded into the first migration by default rather than by decision.
3. **`FOLDER` and `INGESTION_RUN` appear in no Gantt row**, even though D5 assigned
   both. Seventeen columns across two models now sit outside the schedule.

---

---

# Part E — found while implementing

## R25 — the database was going to store `'READY'` while everything else said `'ready'`

Found 20 Aug 2026, fixed the same day, and it would not have announced itself.

SQLAlchemy renders a PostgreSQL enum from the Python member **names**, not their
values. `FileStatus.READY = "ready"` therefore becomes the PG value `'READY'`,
while the ERD, `FileRead`'s `Literal`, and every JSON response say `ready`.

Nothing breaks through the ORM, which maps both directions silently. What breaks
is anything that touches the column as text:

- every hand-written query — `WHERE status = 'ready'` matches zero rows, with no
  error to trace
- **R19 itself.** `is_active` implies `status = 'ready'` is a CHECK constraint
  going into the first migration. Spelled lowercase against an uppercase enum it
  is never true, so it never rejects anything, and it looks like it is working.

Both enums now pass `values_callable`, so `filestatus` and `ingestionrunstatus`
carry the lowercase values the rest of the system already uses. It is free
today; after there is data it is an `ALTER TYPE`.

Applies to `FileStatus` (AI-3) and `IngestionRunStatus` (AI-2) equally — it is
SQLAlchemy's default, not anybody's mistake.

## Summary

| # | Finding | Status |
|---|---------|--------|
| — | Eight ratified fields dropped in drafting | **Restored — Part C** |
| R2 | `MESSAGE.course_id` → `scope_course_id` | Fixed in diagram |
| R3 | `CASCADE` → `RESTRICT` | **Closed 18 Aug — Decision 2 carried RESTRICT** |
| R7 | `FILE.sha256` global UNIQUE | Fixed in diagram |
| R9 | `FOLDER.parent_folder_id` | Fixed in diagram |
| R11 | `COURSE` had no `name` | Fixed in diagram |
| R12 | `page_number` → `page_start` | Fixed in diagram |
| R13 | `MESSAGE_SCOPE_COURSE` junction | **Declined 18 Aug** — reopen condition recorded |
| R14 | `citations` JSONB carries no `chunk_id` | **Accepted 18 Aug — routed to `scope_snapshot`, not `citations`** |
| R1 | `CONVERSATION.user_id` redundant | **Closed — the column was never ratified; removed** |
| R15 | Required `course_id` blocks first-run onboarding | **Accepted 18 Aug — Unsorted course at signup** |
| R6 | `mentioned_file_ids` has no FK; folders unrepresented | **Closed 25 Aug — both halves.** JSONB stays in v1 (18 Aug, on the recommendation). Folder @-mentions expand to a file list at send time and stay frozen — Decision 5, option A, so one column carries one kind of time. The UI has to say so at the moment of mention; logged against F2 |
| R10 | `MESSAGE` has no `sequence_no` | **Deferred** — accepted v1 defect, order implied by `created_at` |
| R16 | Soft delete on `COURSE` / `FILE` | **Declined 18 Aug** — and so **v1 has no delete-course feature**, see R16 |
| R4 | `CHUNK` FKs can contradict each other | **Closed 26 Aug, in two migrations.** r41 (`efda7a3`, 22 Aug) tied a chunk's run to its file via `fk_chunk_run_file_agree`. r42 (`2a22d57`, 26 Aug) tied `course_id` to `file_id`: Decision 02 option B put `course_id` back on FILE so a composite FK had something to point at, making it a chain — `CHUNK(file_id, course_id)` → `FILE(id, course_id)` → and `FILE(folder_id, course_id)` → `FOLDER(id, course_id)`. CR-31. Verified 11/11 by `check_r42.py`, including that a row where all three agree still inserts |
| R5 | Vector scan not filtered by embedding model | **Assigned 25 Aug to AI-1 (Decision 3)** — still open, now owned. Measured 25 Aug: with two runs over one file, the superseded run's chunks take rank 1 and 2 and eat two of five `top_k` slots, silently. `_full_text_search` has the same hole. **Retrieval layer, not the migration**. Reclassified 22 Aug: a constraint rejects a row that is itself invalid, and a chunk embedded by an older model is a perfectly valid row. What is wrong is comparing it against a query embedded by a different one, and no constraint sees a comparison. It belongs in `_vector_similarity_search` in `db/vector_ops.py` as a join to `INGESTION_RUN` filtering on `is_active` and `embedding_model`. `KNOWN_ISSUES` already said as much in the R21 entry — "R5 fixes that at the query" — while this row said first migration; the two contradicted each other until now. **Unassigned.** |
| R8 | `is_active` needs a partial unique index | **Done 22 Aug** (`efda7a3`) — `ix_ingestion_run_one_active` UNIQUE on `(file_id) WHERE is_active`. Verified from empty: a second active run raises `UniqueViolation`, further inactive runs are accepted |
| R17 | `UNIQUE (user_id, code, year, sem)` | **Done 22 Aug** — declared on `Course.__table_args__` and created in the initial migration as `uq_course_user_code_year_sem`. Verified from an empty database: a duplicate raises `UniqueViolationError`, while a second semester, a second year and a second user all insert. |
| R18 | `UNIQUE (ingestion_run_id, chunk_index)` | **Done 22 Aug** (`efda7a3`) — `uq_chunk_run_index`. Verified: a second chunk 0 in one run is rejected; chunk 0 in a re-index run is accepted |
| R19 | `is_active` implies `status = 'ready'` | **Done 22 Aug** (`efda7a3`) — `ck_ingestion_run_active_is_ready`, written `NOT is_active OR status = 'ready'`, lower case per R25. Verified: `is_active` with `processing` is rejected |
| R20 | Supporting index set | **Done 22 Aug** (`efda7a3`) — five indexes created. `COURSE(user_id)` and `CHUNK(ingestion_run_id)` deliberately **not** created: each is the leftmost column of a UNIQUE declared above, and a UNIQUE builds its own index. `INGESTION_RUN(file_id)` **is** created despite R8's index starting with the same column — R8's is partial, and a partial index only answers a query whose own predicate implies its `WHERE` |
| R25 | PostgreSQL enums were going to store member NAMES | **Fixed 20 Aug** — see below |
| R26 | The ERD drew one of CHUNK's three foreign keys | **Fixed 23 Aug** — `erd.mmd` had `INGESTION_RUN ||--o{ CHUNK` and nothing for `file_id` or `course_id`, though both are real foreign keys with `ON DELETE CASCADE`. Found by the Lead reading the rendered diagram against the constraint list. Two lines added, `erd.png` regenerated |
| R21 | `EMBEDDING_PROFILE` entity | Declined for v1 — see R5 |
| R22 | `STORED_OBJECT` split | Declined for v1 |
| R23 | Remove `CHUNK.file_id` / `course_id` | Declined — item 04, see R4 |
| R24 | Full folder tree | Declined — item 04, see R9 |

**Status of the r41 bucket, 24 August.** The seven constraint-and-index findings
scheduled into the first migration — R4, R5, R8, R17, R18, R19, R20 — have resolved
as follows:

| | Where it stands |
|---|---|
| **R8 · R17 · R18 · R19 · R20** | **Done 22 Aug**, on `dev` in `8767fc7` and `efda7a3`, each verified by rebuilding the database from empty and probing it |
| **R4** | **Closed 26 Aug.** The 25 August meeting chose the denormalised column over a trigger (Decision 02, option B), and r42 shipped it as a two-link chain. A trigger would have hidden the rule where neither code review nor `git log` shows it |
| **R5** | **Not a constraint.** Reclassified 22 Aug as a retrieval-layer query predicate, and **unassigned** — also on the 25 August agenda |

**One row is still open, and it is not migration work.** R4 closed on 26 August in
r42 (`2a22d57`); R5 is open and owned by AI-1 since the 25 August meeting. Nothing
on this list is marked "Open — 18 Aug", and nothing is unassigned.
