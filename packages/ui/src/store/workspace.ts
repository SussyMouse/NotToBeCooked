/**
 * C6 — shared workspace state.
 *
 * PROPOSAL, not yet ratified. CR-20 replaced C6's original payload ("route
 * registration convention: where each feature screen mounts") because the
 * unified workspace has no per-feature routes — F1/F2/F3/F4 are panes on one
 * screen. What they need instead is one shared piece of state, and this file
 * is the proposed shape of it.
 *
 * Three panes read and write this store, so every field below belongs to
 * exactly one writer. See the ownership table in the C6 proposal document.
 */

import { create } from "zustand"

export type CourseId = string
export type FileId = string
export type ConversationId = string

/** One open document in the centre viewer. */
export interface Tab {
  fileId: FileId
  /** Denormalised so the tab bar renders without waiting on a fetch. */
  filename: string
  /** Set when the tab was opened from a citation; the viewer jumps here. */
  page: number | null
}

/**
 * Everything scoped to a single course.
 *
 * Keying by course is what makes "switching course saves the current tab set
 * and restores the target course's" fall out as data rather than as an event
 * two panes have to remember to fire.
 */
export interface CourseWorkspace {
  tabs: Tab[]
  activeFileId: FileId | null
  activeConversationId: ConversationId | null
}

const emptyCourse = (): CourseWorkspace => ({
  tabs: [],
  activeFileId: null,
  activeConversationId: null,
})

interface WorkspaceState {
  // ---- scope selectors, written by the top bar (F1) ----
  activeYear: number | null
  activeSemester: number | null
  activeCourseId: CourseId | null

  // ---- per-course panes ----
  byCourse: Record<CourseId, CourseWorkspace>

  // ---- assistant scope, written by the chat pane (F3) ----
  /**
   * Files the user @-mentioned. Narrows retrieval below the whole course, and
   * deliberately not keyed by course: US-12 (MVP, MUST) lets the @-picker
   * surface files from any course, not only the active one. The ratified ERD
   * annotates `mentioned_file_ids` "may cross courses" for the same reason.
   */
  mentionedFileIds: FileId[]

  // ---- actions ----
  setScope: (year: number | null, semester: number | null) => void
  switchCourse: (courseId: CourseId) => void
  openTab: (courseId: CourseId, tab: Tab) => void
  closeTab: (courseId: CourseId, fileId: FileId) => void
  setActiveFile: (courseId: CourseId, fileId: FileId | null) => void
  setActiveConversation: (
    courseId: CourseId,
    conversationId: ConversationId | null
  ) => void
  mentionFile: (fileId: FileId) => void
  clearMentions: () => void
  /**
   * The one cross-pane action: clicking a citation in the chat (F3) may land
   * on a file belonging to a different course, so it has to switch course
   * (F1's slice), open a tab (F2's slice) and focus a page — atomically.
   * Doing it as three separate calls is how tabs end up in the wrong course.
   */
  openCitation: (
    courseId: CourseId,
    fileId: FileId,
    filename: string,
    page: number | null
  ) => void
}

/** Insert or focus `tab` inside `ws`, without duplicating an already-open file. */
function withTab(ws: CourseWorkspace, tab: Tab): CourseWorkspace {
  const existing = ws.tabs.find((t) => t.fileId === tab.fileId)
  const tabs = existing
    ? ws.tabs.map((t) =>
        t.fileId === tab.fileId ? { ...t, page: tab.page ?? t.page } : t
      )
    : [...ws.tabs, tab]
  return { ...ws, tabs, activeFileId: tab.fileId }
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  activeYear: null,
  activeSemester: null,
  activeCourseId: null,
  byCourse: {},
  mentionedFileIds: [],

  setScope: (year, semester) =>
    set({ activeYear: year, activeSemester: semester }),

  // No tab bookkeeping here on purpose: the outgoing course's tabs are
  // already stored under its own key, so switching is just a pointer move.
  //
  // Mentions deliberately survive the switch. Clearing them here would make
  // "@-mention a CS202 file, then ask inside CS301" impossible, which is
  // exactly the case US-12 requires and the team ratified on 2026-07-27.
  // Use clearMentions() when the user actually sends or dismisses.
  switchCourse: (courseId) =>
    set((s) => ({
      activeCourseId: courseId,
      byCourse: s.byCourse[courseId]
        ? s.byCourse
        : { ...s.byCourse, [courseId]: emptyCourse() },
    })),

  openTab: (courseId, tab) =>
    set((s) => ({
      byCourse: {
        ...s.byCourse,
        [courseId]: withTab(s.byCourse[courseId] ?? emptyCourse(), tab),
      },
    })),

  closeTab: (courseId, fileId) =>
    set((s) => {
      const ws = s.byCourse[courseId]
      if (!ws) return s
      const tabs = ws.tabs.filter((t) => t.fileId !== fileId)
      const activeFileId =
        ws.activeFileId === fileId
          ? (tabs.at(-1)?.fileId ?? null)
          : ws.activeFileId
      return {
        byCourse: { ...s.byCourse, [courseId]: { ...ws, tabs, activeFileId } },
      }
    }),

  setActiveFile: (courseId, fileId) =>
    set((s) => ({
      byCourse: {
        ...s.byCourse,
        [courseId]: {
          ...(s.byCourse[courseId] ?? emptyCourse()),
          activeFileId: fileId,
        },
      },
    })),

  setActiveConversation: (courseId, conversationId) =>
    set((s) => ({
      mentionedFileIds: [],
      byCourse: {
        ...s.byCourse,
        [courseId]: {
          ...(s.byCourse[courseId] ?? emptyCourse()),
          activeConversationId: conversationId,
        },
      },
    })),

  mentionFile: (fileId) =>
    set((s) =>
      s.mentionedFileIds.includes(fileId)
        ? s
        : { mentionedFileIds: [...s.mentionedFileIds, fileId] }
    ),

  clearMentions: () => set({ mentionedFileIds: [] }),

  openCitation: (courseId, fileId, filename, page) =>
    set((s) => ({
      activeCourseId: courseId,
      byCourse: {
        ...s.byCourse,
        [courseId]: withTab(s.byCourse[courseId] ?? emptyCourse(), {
          fileId,
          filename,
          page,
        }),
      },
    })),
}))

/**
 * The bridge to the C4 contract.
 *
 * `RagQueryRequest.course_id` and `.file_ids` have no other source: "which
 * course am I in" and "which files did I @-mention" live only here. Without
 * this selector every question is asked against the entire corpus, which
 * defeats the relevance filtering the generation layer relies on.
 *
 * `file_ids` is null rather than [] when nothing is mentioned, because the
 * contract treats null as "no restriction" and an empty list would otherwise
 * read as "restrict to no files at all".
 *
 * `course_id` and `file_ids` can legitimately disagree: the course is the turn's
 * home course, while the mentions may point outside it (US-12). Retrieval must
 * therefore treat `file_ids`, when present, as the scope rather than as a filter
 * applied within `course_id` — otherwise a cross-course mention silently
 * retrieves nothing.
 */
export function ragScope(s: WorkspaceState): {
  course_id: CourseId | null
  file_ids: FileId[] | null
} {
  return {
    course_id: s.activeCourseId,
    file_ids: s.mentionedFileIds.length > 0 ? s.mentionedFileIds : null,
  }
}

const EMPTY_TABS: Tab[] = []

/** Convenience selectors so panes subscribe to one slice, not the whole store. */
export const selectActiveCourse = (
  s: WorkspaceState
): CourseWorkspace | null =>
  s.activeCourseId ? (s.byCourse[s.activeCourseId] ?? null) : null

export const selectTabs = (s: WorkspaceState): Tab[] =>
  s.activeCourseId
    ? (s.byCourse[s.activeCourseId]?.tabs ?? EMPTY_TABS)
    : EMPTY_TABS
