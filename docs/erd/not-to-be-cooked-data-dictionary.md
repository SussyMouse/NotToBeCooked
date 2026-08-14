# NotToBeCooked ERD Data Dictionary

Target: PostgreSQL 16 with `pgvector`. All identifiers are `snake_case`; all timestamps use UTC `timestamptz`.

Legend: `PK` = primary key, `FK` = physical foreign key, `UQ` = unique, `IDX` = indexed, `SNAP` = immutable snapshot value with no foreign-key constraint.

## 1. `users`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Server-generated UUID |
| UQ | `email` | `varchar(320)` | No | Login identifier; normalized lowercase |
|  | `hashed_password` | `text` | No | Argon2 password hash |
|  | `display_name` | `varchar(120)` | Yes | User-facing name |
|  | `created_at` | `timestamptz` | No | Default `now()` |
|  | `updated_at` | `timestamptz` | No | Default `now()` |
|  | `deleted_at` | `timestamptz` | Yes | Soft-delete marker |

## 2. `auth_sessions`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Session ID |
| FK | `user_id` | `uuid` | No | References `users.id` |
| UQ | `refresh_token_hash` | `text` | No | Never store the raw refresh token |
|  | `device_name` | `varchar(160)` | Yes | Browser/device label |
|  | `expires_at` | `timestamptz` | No | Refresh expiry |
|  | `revoked_at` | `timestamptz` | Yes | Revocation timestamp |
|  | `created_at` | `timestamptz` | No | Default `now()` |

## 3. `academic_terms`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Term ID |
| FK | `user_id` | `uuid` | No | References `users.id` |
|  | `calendar_year` | `smallint` | No | Example: `2026` |
|  | `study_year` | `smallint` | No | Example: Year 2 = `2` |
|  | `semester_no` | `smallint` | No | Normally `1` or `2` |
|  | `label` | `varchar(80)` | Yes | Optional display label |
|  | `starts_on` | `date` | Yes | Academic term start |
|  | `ends_on` | `date` | Yes | Academic term end |
|  | `created_at` | `timestamptz` | No | Default `now()` |

Composite unique: (`user_id`, `calendar_year`, `study_year`, `semester_no`). Checks: `study_year > 0`, `semester_no > 0`, `ends_on >= starts_on` when both are present.

## 4. `courses`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Course ID |
| FK | `term_id` | `uuid` | No | References `academic_terms.id` |
|  | `code` | `varchar(32)` | No | Example: `CS202` |
|  | `name` | `varchar(200)` | No | Course title |
|  | `teaching_weeks` | `smallint` | No | Default `14` |
|  | `goal_text` | `text` | Yes | Current course target |
|  | `created_at` | `timestamptz` | No | Default `now()` |
|  | `updated_at` | `timestamptz` | No | Default `now()` |
|  | `archived_at` | `timestamptz` | Yes | Archived course marker |

Composite unique: (`term_id`, `code`). Check: `teaching_weeks > 0`.

## 5. `folders`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Folder ID |
| FK | `course_id` | `uuid` | No | References `courses.id` |
|  | `name` | `varchar(120)` | No | Category/folder name |
|  | `is_root` | `boolean` | No | Hidden root folder; default `false` |
|  | `sort_order` | `integer` | No | Default `0` |
|  | `created_at` | `timestamptz` | No | Default `now()` |
|  | `updated_at` | `timestamptz` | No | Default `now()` |

Composite unique: (`course_id`, `name`). Partial unique: one row per `course_id` where `is_root = true`. There is deliberately no `parent_folder_id`.

## 6. `documents`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Stable logical document ID |
| FK | `folder_id` | `uuid` | No | References `folders.id` |
|  | `display_name` | `varchar(255)` | No | Renameable filename shown in UI |
|  | `created_at` | `timestamptz` | No | Default `now()` |
|  | `updated_at` | `timestamptz` | No | Default `now()` |
|  | `deleted_at` | `timestamptz` | Yes | Soft-delete marker |

`course_id` is deliberately omitted because it is derived through `folder_id`. `current_version_id` is deliberately omitted to prevent a circular FK.

## 7. `document_labels`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Label row ID |
| FK | `document_id` | `uuid` | No | References `documents.id` |
|  | `value` | `varchar(80)` | No | Example: `Exam Core` |
|  | `created_at` | `timestamptz` | No | Default `now()` |

Composite unique: (`document_id`, `value`).

## 8. `document_versions`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Immutable version ID |
| FK | `document_id` | `uuid` | No | References `documents.id` |
|  | `version_no` | `integer` | No | Starts at `1` |
|  | `original_filename` | `varchar(255)` | No | Uploaded filename snapshot |
| UQ | `storage_key` | `text` | No | Object-storage location/key |
| UQ | `sha256` | `char(64)` | No | Binary checksum |
|  | `mime_type` | `varchar(120)` | No | Validated MIME type |
|  | `size_bytes` | `bigint` | No | Non-negative size |
|  | `page_count` | `integer` | Yes | Null for non-paginated formats |
|  | `status` | `varchar(20)` | No | `uploaded`, `processing`, `ready`, `failed` |
|  | `error_message` | `text` | Yes | Latest processing failure |
|  | `is_current` | `boolean` | No | Default `true` |
|  | `uploaded_at` | `timestamptz` | No | Default `now()` |
|  | `indexed_at` | `timestamptz` | Yes | Latest ready timestamp |

Composite unique: (`document_id`, `version_no`). Partial unique: one row per `document_id` where `is_current = true`.

## 9. `ingestion_runs`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Processing attempt ID |
| FK | `document_version_id` | `uuid` | No | References `document_versions.id` |
|  | `status` | `varchar(20)` | No | `queued`, `processing`, `ready`, `failed` |
|  | `chunker_version` | `varchar(80)` | No | Reproducibility metadata |
|  | `embedding_model` | `varchar(160)` | No | Model identifier |
|  | `embedding_dim` | `smallint` | No | Default `1024` |
|  | `is_active` | `boolean` | No | Retrieval-visible run |
|  | `started_at` | `timestamptz` | No | Default `now()` |
|  | `completed_at` | `timestamptz` | Yes | Completion timestamp |
|  | `error_message` | `text` | Yes | Failure details |

Partial unique: one row per `document_version_id` where `is_active = true`. There is deliberately no reverse `active_ingestion_run_id` on `document_versions`.

## 10. `chunks`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Regenerable chunk ID |
| FK | `ingestion_run_id` | `uuid` | No | References `ingestion_runs.id` |
|  | `chunk_index` | `integer` | No | Zero-based position in run |
|  | `page_start` | `integer` | Yes | One-based source page |
|  | `page_end` | `integer` | Yes | One-based ending page |
|  | `heading` | `text` | Yes | Source section heading |
|  | `content` | `text` | No | Extracted text |
|  | `word_count` | `integer` | No | Non-negative |
|  | `token_count` | `integer` | No | Non-negative |
| IDX | `embedding` | `vector(1024)` | No | HNSW/cosine index |
|  | `created_at` | `timestamptz` | No | Default `now()` |

Composite unique: (`ingestion_run_id`, `chunk_index`). Checks: positive pages and `page_end >= page_start` when populated.

## 11. `conversations`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Conversation ID |
| FK | `course_id` | `uuid` | No | References `courses.id` |
|  | `title` | `varchar(200)` | Yes | User/generated title |
|  | `created_at` | `timestamptz` | No | Default `now()` |
|  | `updated_at` | `timestamptz` | No | Default `now()` |
|  | `archived_at` | `timestamptz` | Yes | Archived chat marker |

## 12. `messages`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Message ID |
| FK | `conversation_id` | `uuid` | No | References `conversations.id` |
|  | `sequence_no` | `integer` | No | Ordering within conversation |
|  | `role` | `varchar(16)` | No | `user`, `assistant`, `system` |
|  | `content` | `text` | No | Message body |
|  | `grounded` | `boolean` | Yes | Relevant to assistant RAG answers |
|  | `used_chunks` | `smallint` | Yes | Prompt source count |
|  | `model_name` | `varchar(120)` | Yes | Generator model snapshot |
|  | `scope_snapshot` | `jsonb` | Yes | Selected file/folder filters at query time |
|  | `created_at` | `timestamptz` | No | Default `now()` |

Composite unique: (`conversation_id`, `sequence_no`). There is deliberately no `reply_to_message_id`; order is linear.

## 13. `message_citations`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Citation ID |
| FK | `message_id` | `uuid` | No | References `messages.id` |
|  | `marker` | `smallint` | No | `[1]`, `[2]`, etc. |
| SNAP | `source_document_id` | `uuid` | No | Stable lookup hint; intentionally not an FK |
| SNAP | `source_version_no` | `integer` | No | Version used when answering |
| SNAP | `filename_snapshot` | `varchar(255)` | No | Historical display value |
|  | `page_start` | `integer` | Yes | One-based page |
|  | `page_end` | `integer` | Yes | One-based ending page |
|  | `quote` | `text` | No | Verbatim evidence |
|  | `created_at` | `timestamptz` | No | Default `now()` |

Composite unique: (`message_id`, `marker`). Citation does not reference `chunks`; chunk IDs are unstable after re-ingestion.

## 14. `roadmap_items`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Roadmap item ID |
| FK | `course_id` | `uuid` | No | References `courses.id` |
|  | `position` | `integer` | No | Display ordering |
|  | `week_no` | `smallint` | Yes | Teaching week |
|  | `title` | `varchar(255)` | No | Topic/milestone name |
|  | `item_type` | `varchar(24)` | No | `topic`, `task`, `exam`, `deadline` |
|  | `status` | `varchar(20)` | No | `pending`, `in_progress`, `done`, `skipped` |
|  | `due_at` | `timestamptz` | Yes | Optional deadline |
| SNAP | `source_snapshot` | `jsonb` | Yes | Extracted planner evidence |
|  | `created_at` | `timestamptz` | No | Default `now()` |
|  | `updated_at` | `timestamptz` | No | Default `now()` |

Composite unique: (`course_id`, `position`). No self-referencing prerequisite FK.

## 15. `flashcard_decks`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Deck ID |
| FK | `course_id` | `uuid` | No | References `courses.id` |
|  | `title` | `varchar(200)` | No | Deck title |
|  | `description` | `text` | Yes | Optional description |
|  | `created_at` | `timestamptz` | No | Default `now()` |
|  | `updated_at` | `timestamptz` | No | Default `now()` |
|  | `archived_at` | `timestamptz` | Yes | Archived deck marker |

## 16. `flashcards`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Card ID |
| FK | `deck_id` | `uuid` | No | References `flashcard_decks.id` |
|  | `position` | `integer` | No | Deck ordering |
|  | `question` | `text` | No | Card front |
|  | `answer` | `text` | No | Card back |
| SNAP | `source_snapshot` | `jsonb` | Yes | Grounding evidence, not a document FK |
|  | `created_at` | `timestamptz` | No | Default `now()` |
|  | `updated_at` | `timestamptz` | No | Default `now()` |

Composite unique: (`deck_id`, `position`).

## 17. `flashcard_reviews`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Review event ID |
| FK | `flashcard_id` | `uuid` | No | References `flashcards.id` |
|  | `rating` | `smallint` | No | Recall grade, normally `0..5` |
|  | `reviewed_at` | `timestamptz` | No | Default `now()` |
|  | `next_review_at` | `timestamptz` | Yes | Computed schedule |
|  | `interval_days` | `integer` | No | Non-negative interval |
|  | `ease_factor` | `numeric(4,2)` | No | Scheduling coefficient |

## 18. `study_artifacts`

| Key | Variable | Type | Null | Notes |
|---|---|---|---|---|
| PK | `id` | `uuid` | No | Artifact ID |
| FK | `course_id` | `uuid` | No | References `courses.id` |
|  | `artifact_type` | `varchar(32)` | No | `pyq_matrix`, `summary`, `exam_guide` |
|  | `title` | `varchar(200)` | No | Display title |
|  | `payload` | `jsonb` | No | Artifact-specific structured content |
| SNAP | `source_snapshot` | `jsonb` | Yes | Grounding evidence, not a document FK |
|  | `created_at` | `timestamptz` | No | Default `now()` |
|  | `updated_at` | `timestamptz` | No | Default `now()` |

This table is optional. Omit it if matrices and summaries are always generated on demand and never saved.

## Physical foreign-key list

| Child column | Parent column | Suggested delete behavior |
|---|---|---|
| `auth_sessions.user_id` | `users.id` | `CASCADE` |
| `academic_terms.user_id` | `users.id` | `CASCADE` |
| `courses.term_id` | `academic_terms.id` | `CASCADE` |
| `folders.course_id` | `courses.id` | `CASCADE` |
| `documents.folder_id` | `folders.id` | `RESTRICT` or soft delete |
| `document_labels.document_id` | `documents.id` | `CASCADE` |
| `document_versions.document_id` | `documents.id` | `RESTRICT` or soft delete |
| `ingestion_runs.document_version_id` | `document_versions.id` | `CASCADE` |
| `chunks.ingestion_run_id` | `ingestion_runs.id` | `CASCADE` |
| `conversations.course_id` | `courses.id` | `CASCADE` |
| `messages.conversation_id` | `conversations.id` | `CASCADE` |
| `message_citations.message_id` | `messages.id` | `CASCADE` |
| `roadmap_items.course_id` | `courses.id` | `CASCADE` |
| `flashcard_decks.course_id` | `courses.id` | `CASCADE` |
| `flashcards.deck_id` | `flashcard_decks.id` | `CASCADE` |
| `flashcard_reviews.flashcard_id` | `flashcards.id` | `CASCADE` |
| `study_artifacts.course_id` | `courses.id` | `CASCADE` |

## Dependency chains

```text
auth_session → user
course → academic_term → user
chunk → ingestion_run → document_version → document → folder → course → academic_term → user
message_citation → message → conversation → course → academic_term → user
roadmap_item → course → academic_term → user
flashcard_review → flashcard → flashcard_deck → course → academic_term → user
study_artifact → course → academic_term → user
```

No physical FK points back down any of these chains, so the schema contains no circular dependency.
