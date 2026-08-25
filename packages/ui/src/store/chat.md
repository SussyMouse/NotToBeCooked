Here is what you need to understand conceptually—the **architecture, why decisions were made, data flows, and gotchas**—before writing the state, hooks, TanStack, and API client layers.

---

### 1. The Core Architectural Philosophy: Server State vs. Client State

A common mistake in React apps is duplicating server records into client stores (e.g., storing the entire message history or session list in Zustand). 

* **Server State (TanStack Query / API Client):**
  * *What it owns:* Messages array, Sessions list, Citations, Document metadata.
  * *Why:* This data originates on the server, can become stale, requires caching, deduplication, background re-fetching, and error/retry lifecycles.
* **Client State (Zustand + LocalStorage):**
  * *What it owns:* Pointers and ephemeral UI state (e.g., `activeCourseId`, `activeConversationId`, `mentionedFileIds`, draft query text).
  * *Why:* The client only needs to know *what the user is currently looking at or drafting*. When `activeConversationId` changes in Zustand, TanStack Query automatically fires the fetch for that session's messages.

---

### 2. The Scope Rules & `@` Mentions (Why it works the way it does)

Look at how the backend schemas ([rag.py](file:///home/calvinkhoo/Documents/GitHub/NotToBeCooked/apps/api/app/schemas/rag.py)) and workspace store ([workspace.ts](file:///home/calvinkhoo/Documents/GitHub/NotToBeCooked/packages/ui/src/store/workspace.ts)) define scope:

1. **Course Scoping (Default):**
   * If no specific files are mentioned, `course_id` is the boundary. The backend RAG retrieves chunks belonging only to that course.
2. **File Mention Scoping (Precedence Rule):**
   * When a user types `@[Lecture 1.pdf]`, the UI parses the tag and resolves its `file_id`.
   * In the backend, `file_ids` **overrides** `course_id`.
   * *Why?* A user might be in `CS202` workspace, but explicitly `@mention` a math reference from `MA201`. If the backend ANDed `course_id` with `file_ids`, cross-course queries would retrieve 0 chunks.
3. **Session Home Course:**
   * A `Conversation` record is bound to a single home `course_id`. Even if turns mention other files, the conversation itself belongs to the active course workspace.

---

### 3. End-to-End Flow of a Message Turn

Here is the exact lifecycle of what happens when a user sends a query:

```
User types "Explain QuickSort @[Lecture 4.pdf]"
                      │
                      ▼
1. Client-Side Mention Extraction:
   - Extract raw question: "Explain QuickSort"
   - Extract target file IDs: ["cs202-lec4-uuid"]
                      │
                      ▼
2. TanStack Query Optimistic Update:
   - Immediately append the user message to the query cache for activeConversationId
   - Show typing/bouncing indicator
                      │
                      ▼
3. Call API Client:
   - POST /rag/query { question, course_id, conversation_id, file_ids }
                      │
                      ▼
4. Backend Processing:
   - Calls `get_or_create_conversation`:
     * If conversation_id is NULL (first turn of new chat), it inserts a new Conversation in DB.
     * If conversation_id is present, it verifies ownership and appends to it.
   - Runs retrieval on chunks & generates grounded answer + citations.
                      │
                      ▼
5. Client Response Handling:
   - If turn 1 created a new session, update Zustand's `activeConversationId` with the new ID.
   - Invalidate `["sessions", courseId]` so the History drawer / sidebar shows the new title.
   - Append the assistant turn (answer + citations) to the TanStack cache.
```

---

### 4. Data Normalization & Contract Transformations

There is a shape difference between the backend API contract and UI rendering:

* **Citations:**
  * Backend returns `Citation`: `{ marker, file_id, page_start, page_end, quote }` (anchored to file + page so it survives re-indexing).
  * Frontend renders `CitationItem`: `{ f: file_id, p: page_start, l: "File Name · p.1", quote }`.
  * *Your hook/mapper must look up `file_id` in your course files map to give it a human-friendly label `l`.*
* **Messages:**
  * Backend returns `MessageRead`: `{ id, role: "user" | "assistant", content, citations, created_at }`.
  * Frontend UI accepts this directly through the `ChatMessage` interface.

---

### 5. Session Management & Navigation Lifecycle

* **Opening a Course:**
  * When `activeCourseId` changes, TanStack fetches `GET /chat/sessions?course_id=...`.
  * If a previous `activeConversationId` was saved in localStorage for that course, load it; otherwise leave as `null` (shows the Hero Welcome screen).
* **Selecting a Session in History:**
  * Sets `activeConversationId = selectedId` in Zustand.
  * TanStack fetches `GET /chat/sessions/{session_id}`, which returns the conversation metadata and ordered message list (`ConversationDetail`).
* **Starting a "New Chat":**
  * Set `activeConversationId = null`.
  * Do **not** call any API endpoint yet! The new session is only created on the backend when the user actually sends their first message.
* **Deleting a Session:**
  * Call `DELETE /chat/sessions/{session_id}`.
  * Invalidate sessions list query.
  * If the deleted session was currently active, reset `activeConversationId = null`.

---

### 6. The Cross-Pane Interaction: Citations $\rightarrow$ Viewer

* When a citation in the chat is clicked:
  * Chat fires `onCiteClick(citation)` / `onOpenDocument(fileId, page)`.
  * This action needs to call `useWorkspace.getState().openCitation(courseId, fileId, filename, page)`.
  * *Why:* Clicking evidence might point to a file not currently open in the center tabs. The store atomically opens the tab, focuses the page, and switches course context if necessary.

---

### Summary Flow Checklist for Your Implementation

1. **`api_client.ts`**: Add `/chat/sessions` (GET, DELETE), `/chat/sessions/{id}` (GET), and `/rag/query` (POST).
2. **`useChatStore` or `useWorkspace`**: Store active IDs (`courseId`, `conversationId`) with `persist` middleware.
3. **TanStack Queries**:
   * `useQuery({ queryKey: ["sessions", courseId], queryFn: ... })`
   * `useQuery({ queryKey: ["session", conversationId], queryFn: ..., enabled: !!conversationId })`
4. **TanStack Mutation (`useSendMessage`)**:
   * Optimistic turn insertion $\rightarrow$ `POST /rag/query` $\rightarrow$ set new `conversationId` if first turn $\rightarrow$ cache invalidation.

Edited index.ts
Edited api_client.ts
Viewed api_client.ts:207-246