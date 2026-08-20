/**
 * Workspace Local Storage Persistence Service
 *
 * Encapsulates all browser localStorage interactions, serialization, error
 * handling (SSR environments, quota limits, JSON corruption), and schema versioning
 * for workspace tabs and active course state.
 */

import type { CourseWorkspace, Tab } from "../store/workspace"

export const STORAGE_KEY = "ntbc_workspace_tabs_v1"
export const SCHEMA_VERSION = 1

export interface PersistedWorkspaceCourse {
  tabs: Tab[]
  activeFileId: string | null
}

export interface PersistedWorkspaceState {
  version: number
  activeCourseId: string | null
  byCourse: Record<string, PersistedWorkspaceCourse>
  savedAt: number
}

/** Check if localStorage is safely accessible in the current execution environment */
function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false
  }
  try {
    const testKey = "__ntbc_storage_test__"
    window.localStorage.setItem(testKey, testKey)
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Safely load persisted workspace state from localStorage.
 * Returns null if storage is unavailable, empty, or corrupted.
 */
export function loadPersistedWorkspace(): PersistedWorkspaceState | null {
  if (!isLocalStorageAvailable()) return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as PersistedWorkspaceState
    if (!parsed || parsed.version !== SCHEMA_VERSION || typeof parsed.byCourse !== "object") {
      return null
    }

    return parsed
  } catch (error) {
    console.warn("[WorkspaceStorage] Failed to read workspace state:", error)
    return null
  }
}

let writeTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Safely persist workspace state to localStorage with debouncing.
 * Prevents thrashing localStorage during rapid interactions (e.g. fast switching/scrolling).
 */
export function savePersistedWorkspace(
  activeCourseId: string | null,
  byCourse: Record<string, CourseWorkspace>,
  debounceMs = 300
): void {
  if (!isLocalStorageAvailable()) return

  if (writeTimeout) {
    clearTimeout(writeTimeout)
  }

  writeTimeout = setTimeout(() => {
    try {
      // Only serialize tabs and activeFileId (keep conversations / mentions ephemeral)
      const cleanByCourse: Record<string, PersistedWorkspaceCourse> = {}
      for (const [courseId, ws] of Object.entries(byCourse)) {
        if (ws && Array.isArray(ws.tabs)) {
          cleanByCourse[courseId] = {
            tabs: ws.tabs,
            activeFileId: ws.activeFileId ?? null,
          }
        }
      }

      const payload: PersistedWorkspaceState = {
        version: SCHEMA_VERSION,
        activeCourseId,
        byCourse: cleanByCourse,
        savedAt: Date.now(),
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.warn("[WorkspaceStorage] Failed to write workspace state:", error)
    }
  }, debounceMs)
}

/** Clear persisted workspace storage */
export function clearPersistedWorkspace(): void {
  if (!isLocalStorageAvailable()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn("[WorkspaceStorage] Failed to clear workspace state:", error)
  }
}
