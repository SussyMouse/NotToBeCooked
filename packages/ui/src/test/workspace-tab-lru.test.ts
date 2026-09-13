import { describe, it, beforeEach } from "node:test"
import assert from "node:assert/strict"

// ---------------------------------------------------------------------------
// In-memory mock localStorage for Node testing environment
// ---------------------------------------------------------------------------
class MockLocalStorage {
  private store: Map<string, string> = new Map()

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  get length(): number {
    return this.store.size
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
}

// Polyfill global window & localStorage for tests
const mockStorage = new MockLocalStorage()
Object.assign(globalThis, {
  window: { localStorage: mockStorage },
  localStorage: mockStorage,
})

// Import storage module after polyfilling window.localStorage
import {
  loadPersistedWorkspace,
  savePersistedWorkspace,
  clearPersistedWorkspace,
  STORAGE_KEY,
  SCHEMA_VERSION,
} from "../lib/workspace-storage.ts"
import { useWorkspace, type CourseWorkspace } from "../store/workspace.ts"

// ---------------------------------------------------------------------------
// 1. Workspace LocalStorage Persistence Tests
// ---------------------------------------------------------------------------
describe("Workspace Storage Layer", () => {
  beforeEach(() => {
    mockStorage.clear()
  })

  it("returns null when storage is empty", () => {
    const data = loadPersistedWorkspace()
    assert.equal(data, null)
  })

  it("persists workspace state with schema versioning and isolates courses", async () => {
    const byCourse: Record<string, CourseWorkspace> = {
      cs202: {
        tabs: [
          {
            fileId: "f1",
            filename: "Lec1.pdf",
            page: 3,
            zoomLevel: 120,
            scrollPos: 450,
          },
          {
            fileId: "f2",
            filename: "Lab1.pdf",
            page: 1,
            zoomLevel: 100,
            scrollPos: 0,
          },
        ],
        activeFileId: "f1",
        activeConversationId: "conv-123",
      },
      cs210: {
        tabs: [
          {
            fileId: "f3",
            filename: "GraphFlow.pdf",
            page: 8,
            zoomLevel: 110,
            scrollPos: 200,
          },
        ],
        activeFileId: "f3",
        activeConversationId: null,
      },
    }

    savePersistedWorkspace("cs202", byCourse, 10)

    // Wait for debounced write
    await new Promise((r) => setTimeout(r, 30))

    const raw = mockStorage.getItem(STORAGE_KEY)
    assert.ok(raw, "Expected data in localStorage")

    const parsed = JSON.parse(raw!)
    assert.equal(parsed.version, SCHEMA_VERSION)
    assert.equal(parsed.activeCourseId, "cs202")
    assert.equal(parsed.byCourse.cs202.tabs.length, 2)
    assert.equal(parsed.byCourse.cs202.tabs[0].page, 3)
    assert.equal(parsed.byCourse.cs202.tabs[0].zoomLevel, 120)
    assert.equal(parsed.byCourse.cs202.activeConversationId, "conv-123")
    assert.equal(parsed.byCourse.cs210.tabs[0].page, 8)

    // Read back via loadPersistedWorkspace
    const loaded = loadPersistedWorkspace()
    assert.ok(loaded)
    assert.equal(loaded?.activeCourseId, "cs202")
    assert.equal(loaded?.byCourse.cs202.tabs[0].filename, "Lec1.pdf")
    assert.equal(loaded?.byCourse.cs202.activeConversationId, "conv-123")
  })

  it("handles corrupted JSON gracefully without crashing", () => {
    mockStorage.setItem(STORAGE_KEY, "INVALID_JSON_CORRUPTED{")
    const loaded = loadPersistedWorkspace()
    assert.equal(loaded, null)
  })

  it("invalidates stale schema versions gracefully", () => {
    mockStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 999, // Unknown / mismatched schema version
        activeCourseId: "cs202",
        byCourse: {},
      })
    )
    const loaded = loadPersistedWorkspace()
    assert.equal(loaded, null)
  })

  it("clears persisted workspace correctly", () => {
    mockStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1 }))
    clearPersistedWorkspace()
    assert.equal(mockStorage.getItem(STORAGE_KEY), null)
  })
})

// ---------------------------------------------------------------------------
// 2. LRU Document Viewer Caching Logic Tests
// ---------------------------------------------------------------------------
describe("LRU Document Viewer Cache Algorithm", () => {
  /** Pure LRU state update function mirroring the dashboard implementation */
  function updateLruList(
    activeItem: string | null,
    validItems: string[],
    prevCached: string[],
    maxCapacity = 4
  ): string[] {
    if (!activeItem) {
      const validSet = new Set(validItems)
      return prevCached.filter((id) => validSet.has(id))
    }
    const validSet = new Set(validItems)
    const next = [
      activeItem,
      ...prevCached.filter((id) => id !== activeItem && validSet.has(id)),
    ].slice(0, maxCapacity)
    return next
  }

  it("adds opened tabs up to max capacity", () => {
    let cache: string[] = []
    const openTabs = ["f1", "f2", "f3"]

    cache = updateLruList("f1", openTabs, cache, 4)
    assert.deepEqual(cache, ["f1"])

    cache = updateLruList("f2", openTabs, cache, 4)
    assert.deepEqual(cache, ["f2", "f1"])

    cache = updateLruList("f3", openTabs, cache, 4)
    assert.deepEqual(cache, ["f3", "f2", "f1"])
  })

  it("evicts the least recently used tab when capacity is exceeded", () => {
    let cache: string[] = []
    const openTabs = ["f1", "f2", "f3", "f4", "f5"]

    cache = updateLruList("f1", openTabs, cache, 4) // ["f1"]
    cache = updateLruList("f2", openTabs, cache, 4) // ["f2", "f1"]
    cache = updateLruList("f3", openTabs, cache, 4) // ["f3", "f2", "f1"]
    cache = updateLruList("f4", openTabs, cache, 4) // ["f4", "f3", "f2", "f1"]

    assert.equal(cache.length, 4)
    assert.deepEqual(cache, ["f4", "f3", "f2", "f1"])

    // Opening 5th file evicts 'f1' (least recently used)
    cache = updateLruList("f5", openTabs, cache, 4)
    assert.equal(cache.length, 4)
    assert.deepEqual(cache, ["f5", "f4", "f3", "f2"])
    assert.ok(!cache.includes("f1"), "f1 should have been evicted")
  })

  it("promotes an already-cached file to the front when re-selected", () => {
    let cache = ["f4", "f3", "f2", "f1"]
    const openTabs = ["f1", "f2", "f3", "f4"]

    // Re-focus 'f2'
    cache = updateLruList("f2", openTabs, cache, 4)
    assert.deepEqual(cache, ["f2", "f4", "f3", "f1"])
    assert.equal(cache.length, 4)

    // Re-focus 'f1'
    cache = updateLruList("f1", openTabs, cache, 4)
    assert.deepEqual(cache, ["f1", "f2", "f4", "f3"])
  })

  it("prunes closed tabs from the cache immediately", () => {
    let cache = ["f4", "f3", "f2", "f1"]
    // User closes tab 'f3'
    const openTabsAfterClose = ["f1", "f2", "f4"]

    cache = updateLruList("f4", openTabsAfterClose, cache, 4)
    assert.deepEqual(cache, ["f4", "f2", "f1"])
    assert.ok(!cache.includes("f3"), "f3 should be removed from cache")
  })
})

// ---------------------------------------------------------------------------
// 3. Per-Tab View State Isolation Tests
// ---------------------------------------------------------------------------
describe("Per-Tab View State Isolation", () => {
  interface TabState {
    fileId: string
    page: number
    zoomLevel: number
    scrollPos: number
  }

  it("preserves independent page and zoom levels across different tabs", () => {
    const tabs: Map<string, TabState> = new Map([
      ["f1", { fileId: "f1", page: 1, zoomLevel: 100, scrollPos: 0 }],
      ["f2", { fileId: "f2", page: 1, zoomLevel: 100, scrollPos: 0 }],
    ])

    // User navigates f1 to page 5 with 130% zoom
    tabs.set("f1", { ...tabs.get("f1")!, page: 5, zoomLevel: 130 })

    // User switches to f2 and navigates to page 2 with 80% zoom
    tabs.set("f2", { ...tabs.get("f2")!, page: 2, zoomLevel: 80 })

    // Verify f1 view state was unaffected
    const f1 = tabs.get("f1")!
    const f2 = tabs.get("f2")!

    assert.equal(f1.page, 5)
    assert.equal(f1.zoomLevel, 130)

    assert.equal(f2.page, 2)
    assert.equal(f2.zoomLevel, 80)
  })
})

// ---------------------------------------------------------------------------
// 4. File Rename Synchronization Tests
// ---------------------------------------------------------------------------
describe("Workspace File Rename Synchronization", () => {
  beforeEach(() => {
    useWorkspace.setState({
      activeCourseId: "cs202",
      byCourse: {
        cs202: {
          tabs: [
            {
              fileId: "file-1",
              filename: "Lecture 1.pdf",
              page: 3,
              zoomLevel: 125,
              scrollPos: 480,
            },
            {
              fileId: "file-2",
              filename: "Lecture 2.pdf",
              page: 1,
              zoomLevel: 100,
              scrollPos: 0,
            },
          ],
          activeFileId: "file-1",
          activeConversationId: "conversation-1",
        },
        cs210: {
          tabs: [
            {
              fileId: "file-1",
              filename: "Lecture 1.pdf",
              page: 7,
              zoomLevel: 90,
              scrollPos: 240,
            },
          ],
          activeFileId: "file-1",
          activeConversationId: null,
        },
      },
    })
  })

  it("updates matching tab names while preserving their view state", () => {
    useWorkspace.getState().renameFileReferences("file-1", "Architecture.pdf")

    const state = useWorkspace.getState()
    const cs202File = state.byCourse.cs202!.tabs[0]!
    const unaffectedFile = state.byCourse.cs202!.tabs[1]!
    const cs210File = state.byCourse.cs210!.tabs[0]!

    assert.equal(cs202File.filename, "Architecture.pdf")
    assert.equal(cs210File.filename, "Architecture.pdf")

    assert.equal(cs202File.page, 3)
    assert.equal(cs202File.zoomLevel, 125)
    assert.equal(cs202File.scrollPos, 480)

    assert.equal(cs210File.page, 7)
    assert.equal(cs210File.zoomLevel, 90)
    assert.equal(cs210File.scrollPos, 240)

    assert.equal(unaffectedFile.filename, "Lecture 2.pdf")
    assert.equal(state.byCourse.cs202!.activeConversationId, "conversation-1")
  })
})
