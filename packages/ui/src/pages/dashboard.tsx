import { useState, useMemo, useEffect } from "react"
import { useAuth } from "../context/auth-context"
import {
  useWorkspace,
  selectTabs,
  selectActiveCourse,
} from "../store/workspace"
import { useChatSession } from "../hooks/useChatSession"
import Chat, { type CitationItem, type ChatFile } from "../components/chat/Chat"

export interface DashboardPageProps {
  platform?: "web" | "tauri"
}

// ---------------------------------------------------------------------------
// Mock / Stub Course Catalog & File Repository for Development and Testing
// ---------------------------------------------------------------------------
interface MockCourse {
  id: string
  code: string
  name: string
  year: number
  semester: number
  description: string
}

interface MockDocumentFile extends ChatFile {
  totalPages: number
  uploadedAt: string
  size: string
  contentByPage?: Record<number, string>
}

const MOCK_COURSES: MockCourse[] = [
  {
    id: "c2020000-0000-4000-8000-000000000202",
    code: "CS202",
    name: "Software Engineering",
    year: 2,
    semester: 2,
    description:
      "Design patterns, architecture, agile methodologies, and testing.",
  },
  {
    id: "c2100000-0000-4000-8000-000000000210",
    code: "CS210",
    name: "Data Structures & Algorithms",
    year: 2,
    semester: 2,
    description: "Trees, graphs, dynamic programming, and complexity analysis.",
  },
  {
    id: "a2010000-0000-4000-8000-000000000201",
    code: "MA201",
    name: "Linear Algebra & Probability",
    year: 2,
    semester: 1,
    description: "Vector spaces, eigenvalues, SVD, and Bayesian inference.",
  },
  {
    id: "c1010000-0000-4000-8000-000000000101",
    code: "CS101",
    name: "Computer Systems & Architecture",
    year: 1,
    semester: 1,
    description: "Digital logic, CPU pipeline, cache hierarchy, and assembly.",
  },
]

const MOCK_FILES_BY_COURSE: Record<string, MockDocumentFile[]> = {
  "c2020000-0000-4000-8000-000000000202": [
    {
      id: "f2020004-0000-4000-8000-000000000004",
      name: "Lecture 4 - Architectural Patterns.pdf",
      category: "Lecture Decks",
      totalPages: 32,
      uploadedAt: "2 days ago",
      size: "2.4 MB",
      contentByPage: {
        1: "Lecture 4: Architectural Patterns & Decoupled Systems\n\nOverview:\nIn this session, we investigate event-driven systems, layered architectures, and microkernel plugins.",
        4: "Microkernel & Plugin Architecture:\n\nThe core system provides minimal functionality required for operations. Plugins extend the core with specific domain logic and custom adapters.",
        8: "Clean Architecture & Dependency Inversion Principle (DIP):\nHigh-level modules should not depend on low-level modules. Both should depend on abstractions.",
      },
    },
    {
      id: "f2020001-0000-4000-8000-000000000001",
      name: "Lecture 1 - SOLID Principles & OOP.pdf",
      category: "Lecture Decks",
      totalPages: 24,
      uploadedAt: "1 week ago",
      size: "1.8 MB",
      contentByPage: {
        1: "Lecture 1: SOLID Principles\n\nSingle Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.",
      },
    },
    {
      id: "f2020003-0000-4000-8000-000000000003",
      name: "Lab 3 - State Management & Hooks.pdf",
      category: "Lab Handouts",
      totalPages: 6,
      uploadedAt: "3 days ago",
      size: "820 KB",
      contentByPage: {
        1: "Lab 3 Instructions: Integrating Zustand with React\n\nTask: Build a multi-pane layout syncing tab state across separate component trees.",
      },
    },
    {
      id: "f2020002-0000-4000-8000-000000000002",
      name: "Tutorial 1 - Component Testing & Mocks.pdf",
      category: "Tutorials & PYQs",
      totalPages: 8,
      uploadedAt: "5 days ago",
      size: "1.1 MB",
      contentByPage: {
        1: "Tutorial 1: Testing and Mocking in TypeScript\n\nExercise: How to test components with external backend dependencies using stubs and mocks.",
      },
    },
    {
      id: "f2020025-0000-4000-8000-000000000025",
      name: "Midterm Exam 2025 Solutions.pdf",
      category: "Tutorials & PYQs",
      totalPages: 12,
      uploadedAt: "2 weeks ago",
      size: "3.2 MB",
    },
    {
      id: "f2020000-0000-4000-8000-000000000000",
      name: "Course Planner & Syllabus 2026.pdf",
      category: "Course Planner",
      totalPages: 4,
      uploadedAt: "1 month ago",
      size: "450 KB",
    },
  ],
  "c2100000-0000-4000-8000-000000000210": [
    {
      id: "f2100006-0000-4000-8000-000000000006",
      name: "Lecture 6 - Graph Algorithms & Flow.pdf",
      category: "Lecture Decks",
      totalPages: 28,
      uploadedAt: "4 days ago",
      size: "3.1 MB",
    },
    {
      id: "f2100002-0000-4000-8000-000000000002",
      name: "Lab 2 - Red-Black Trees Implementation.pdf",
      category: "Lab Handouts",
      totalPages: 5,
      uploadedAt: "1 week ago",
      size: "640 KB",
    },
    {
      id: "f2100024-0000-4000-8000-000000000024",
      name: "Past Year Final Exam 2024.pdf",
      category: "Tutorials & PYQs",
      totalPages: 16,
      uploadedAt: "3 weeks ago",
      size: "4.5 MB",
    },
  ],
  "a2010000-0000-4000-8000-000000000201": [
    {
      id: "fa201003-0000-4000-8000-000000000003",
      name: "Lecture 3 - Singular Value Decomposition.pdf",
      category: "Lecture Decks",
      totalPages: 20,
      uploadedAt: "6 days ago",
      size: "2.1 MB",
    },
    {
      id: "fa201002-0000-4000-8000-000000000002",
      name: "Tutorial 2 - Eigenvalues & Diagonalization.pdf",
      category: "Tutorials & PYQs",
      totalPages: 7,
      uploadedAt: "2 weeks ago",
      size: "980 KB",
    },
  ],
  "c1010000-0000-4000-8000-000000000101": [
    {
      id: "fc101002-0000-4000-8000-000000000002",
      name: "Lecture 2 - Memory Hierarchy & Cache.pdf",
      category: "Lecture Decks",
      totalPages: 18,
      uploadedAt: "1 month ago",
      size: "1.5 MB",
    },
  ],
}

const DEFAULT_COURSE_ID = "c2020000-0000-4000-8000-000000000202"
const CATEGORIES = [
  "Course Planner",
  "Lecture Decks",
  "Lab Handouts",
  "Tutorials & PYQs",
]

export function DashboardPage({ platform = "web" }: DashboardPageProps) {
  const { user, logout } = useAuth()

  // Workspace Zustand store
  const activeCourseId =
    useWorkspace((s) => s.activeCourseId) || DEFAULT_COURSE_ID
  const switchCourse = useWorkspace((s) => s.switchCourse)
  const tabs = useWorkspace(selectTabs)
  const activeCourseWorkspace = useWorkspace(selectActiveCourse)
  const activeFileId =
    activeCourseWorkspace?.activeFileId ?? (tabs[0]?.fileId || null)
  const openTab = useWorkspace((s) => s.openTab)
  const closeTab = useWorkspace((s) => s.closeTab)
  const setActiveFile = useWorkspace((s) => s.setActiveFile)
  const openCitation = useWorkspace((s) => s.openCitation)

  // Chat Session Hook
  const {
    sessions,
    messages,
    activeConversationId,
    isLoadingMessages,
    isSending,
    sendMessage,
    deleteSession,
    selectSession,
    startNewChat,
  } = useChatSession(activeCourseId)

  // Local UI states
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(
    null
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [pageOverride, setPageOverride] = useState<number | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Initialize course if not selected
  useEffect(() => {
    if (!useWorkspace.getState().activeCourseId) {
      switchCourse(DEFAULT_COURSE_ID)
    }
  }, [switchCourse])

  // Current course metadata & files
  const currentCourse = useMemo(() => {
    return (
      MOCK_COURSES.find(
        (c) => c.id === activeCourseId || c.code === activeCourseId
      ) ?? MOCK_COURSES[0]!
    )
  }, [activeCourseId])

  const courseFiles = useMemo(() => {
    return (
      MOCK_FILES_BY_COURSE[currentCourse.id] ||
      MOCK_FILES_BY_COURSE[currentCourse.code] ||
      []
    )
  }, [currentCourse])

  // Filtered files in explorer
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return courseFiles
    const q = searchQuery.toLowerCase()
    return courseFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.category && f.category.toLowerCase().includes(q))
    )
  }, [courseFiles, searchQuery])

  // Active opened document
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.fileId === activeFileId) || null
  }, [tabs, activeFileId])

  const activeDocument = useMemo(() => {
    if (!activeFileId) return null
    return courseFiles.find((f) => f.id === activeFileId) || null
  }, [courseFiles, activeFileId])

  const activePage = pageOverride ?? activeTab?.page ?? 1

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleOpenFile = (file: MockDocumentFile) => {
    openTab(activeCourseId, {
      fileId: file.id,
      filename: file.name,
      page: 1,
    })
    setPageOverride(1)
    setSelectedCitation(null)
  }

  const handleCitationClick = (cite: CitationItem) => {
    setSelectedCitation(cite)
    const targetFile = courseFiles.find((f) => f.id === cite.f) || {
      id: cite.f,
      name: cite.l.split(" · ")[0] || "Referenced Document.pdf",
    }

    openCitation(activeCourseId, cite.f, targetFile.name, cite.p)
    setPageOverride(cite.p || 1)
  }

  const handleSendMessage = async (text: string) => {
    try {
      const res = await sendMessage(text)
      if (res && res.answer) {
        return {
          text: res.answer,
          cites: res.citations?.map((c) => ({
            f: c.file_id,
            p: c.page ?? 1,
            l: c.filename
              ? `${c.filename} · p.${c.page ?? 1}`
              : `Document · p.${c.page ?? 1}`,
            quote: c.quote,
          })),
        }
      }
    } catch {
      // Fallback is handled inside Chat component when undefined is returned
    }
  }

  const handleOpenDocumentFromChat = (fileId: string, page: number) => {
    const targetFile = courseFiles.find((f) => f.id === fileId)
    openTab(activeCourseId, {
      fileId,
      filename: targetFile?.name || fileId,
      page,
    })
    setPageOverride(page)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-(--bg-canvas,#161F29) font-sans text-(--tx,#DCE3EA) select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 animate-in items-center gap-2 rounded-lg border border-(--acc,#52A8EA) bg-(--bg-raise,#1C2833) px-4 py-2 text-xs text-(--tx,#DCE3EA) shadow-lg duration-200 fade-in slide-in-from-bottom-2">
          <span className="h-2 w-2 rounded-full bg-(--acc,#52A8EA)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Top Navbar (F1) */}
        <header className="z-10 flex h-12 flex-none items-center justify-between border-b border-(--line,#25313E) bg-(--bg-bar,#101821) px-4">
          <div className="flex items-center gap-3">
            <img
              src="/ntbc-logo.png"
              alt="NotToBeCooked Logo"
              className="h-6 w-6 rounded object-contain"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-wide text-primary">
                NotToBeCooked
              </span>
              <span className="rounded border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-2 py-0.5 font-mono text-[10px] text-(--tx-dim,#8B98A7) uppercase">
                {platform}
              </span>
            </div>

            <div className="ml-4 hidden items-center gap-1.5 border-l border-(--line,#25313E) pl-4 text-xs text-(--tx-dim,#8B98A7) md:flex">
              <span className="font-medium text-(--tx,#DCE3EA)">
                {currentCourse.code}
              </span>
              <span>·</span>
              <span className="text-(--tx-faint,#5C6976)">
                {currentCourse.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {user && (
              <span className="hidden text-(--tx-dim,#8B98A7) sm:inline">
                Logged in as{" "}
                <strong className="text-(--tx,#DCE3EA)">{user.email}</strong>
              </span>
            )}
            <button
              onClick={() => logout()}
              className="cursor-pointer rounded border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-3 py-1 text-xs text-(--tx-dim,#8B98A7) transition-colors hover:border-destructive hover:text-white"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Main 3-Pane Split View */}
        <div className="flex min-h-0 min-w-0 flex-1">
          {/* Left Pane: Explorer & Course Materials (F4) */}
          <aside className="flex min-h-0 w-64 flex-none flex-col border-r border-(--line,#25313E) bg-(--bg-panel,#121A23)">
            {/* Scope / Course Switcher */}
            <div className="flex flex-col gap-2 border-b border-(--line-soft,#1B2530) p-3">
              <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-(--tx-faint,#5C6976) uppercase">
                <span>Courses</span>
                <span>{MOCK_COURSES.length} Enrolled</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MOCK_COURSES.map((c) => {
                  const isSelected =
                    activeCourseId === c.id || activeCourseId === c.code
                  return (
                    <button
                      key={c.id}
                      onClick={() => switchCourse(c.id)}
                      className={`flex cursor-pointer flex-col rounded-lg border p-2 text-left transition-all ${
                        isSelected
                          ? "border-(--acc,#52A8EA)/30 bg-(--bg-raise,#1C2833) text-(--acc,#52A8EA) shadow-sm"
                          : "border-(--line-soft,#1B2530) bg-transparent text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                      }`}
                    >
                      <span className="text-xs font-bold">{c.code}</span>
                      <span className="truncate text-[10px] text-(--tx-faint,#5C6976)">
                        {c.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Document Filter & Upload (Stub) */}
            <div className="flex flex-col gap-2 border-b border-(--line-soft,#1B2530) p-3 pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-wider text-(--tx-faint,#5C6976) uppercase">
                  Materials ({courseFiles.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    showToast("File upload stub: Document ingestion simulated.")
                  }
                  className="flex cursor-pointer items-center gap-1 text-[11px] text-(--acc,#52A8EA) hover:underline"
                >
                  <span>+ Upload</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 rounded border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-2 py-1 text-xs">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="text-(--tx-faint,#5C6976)"
                >
                  <path
                    d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter materials..."
                  className="w-full bg-transparent text-xs text-(--tx,#DCE3EA) outline-none placeholder:text-(--tx-faint,#5C6976)"
                />
              </div>
            </div>

            {/* Categorized File Tree */}
            <div className="flex min-h-0 flex-1 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent] flex-col gap-3 overflow-y-auto p-2">
              {CATEGORIES.map((cat) => {
                const filesInCat = filteredFiles.filter(
                  (f) => f.category === cat
                )
                if (filesInCat.length === 0) return null

                return (
                  <div key={cat} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between px-2 py-1 font-mono text-[10px] tracking-wider text-(--tx-faint,#5C6976) uppercase">
                      <span>{cat}</span>
                      <span>{filesInCat.length}</span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {filesInCat.map((file) => {
                        const isOpen = tabs.some((t) => t.fileId === file.id)
                        const isActive = activeFileId === file.id

                        return (
                          <button
                            key={file.id}
                            onClick={() => handleOpenFile(file)}
                            className={`group flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                              isActive
                                ? "border border-(--acc,#52A8EA)/20 bg-(--bg-raise,#1C2833) font-medium text-(--acc,#52A8EA)"
                                : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                            }`}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 16 16"
                              fill="none"
                              className="shrink-0 text-(--tx-faint,#5C6976) group-hover:text-(--acc,#52A8EA)"
                            >
                              <path
                                d="M4 2h5.5L13 5.5V14H4V2z"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M9 2v4h4"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <span className="flex-1 truncate">{file.name}</span>
                            {isOpen && (
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--acc,#52A8EA)"
                                title="Open in Tab"
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>

          {/* Center Workspace: Tabs & Document Viewer (F2) */}
          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-(--bg-canvas,#161F29)">
            {/* Tabs Bar */}
            {tabs.length > 0 && (
              <div className="flex h-9 flex-none scrollbar-none items-center gap-1 overflow-x-auto border-b border-(--line,#25313E) bg-(--bg-bar,#101821) px-2">
                {tabs.map((tab) => {
                  const isActive = tab.fileId === activeFileId
                  return (
                    <div
                      key={tab.fileId}
                      onClick={() => setActiveFile(activeCourseId, tab.fileId)}
                      className={`flex max-w-50 cursor-pointer items-center gap-2 rounded-t border-t-2 px-3 py-1.5 text-xs transition-colors ${
                        isActive
                          ? "border-(--acc,#52A8EA) bg-(--bg-canvas,#161F29) font-medium text-(--tx,#DCE3EA)"
                          : "border-transparent bg-transparent text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                      }`}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="shrink-0 text-(--tx-faint,#5C6976)"
                      >
                        <path
                          d="M4 2h5.5L13 5.5V14H4V2z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                      </svg>
                      <span className="truncate">{tab.filename}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeTab(activeCourseId, tab.fileId)
                        }}
                        className="rounded p-0.5 text-(--tx-faint,#5C6976) hover:bg-(--line,#25313E) hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Document Viewer or Workspace Overview */}
            {activeDocument ? (
              /* ACTIVE DOCUMENT VIEWER (Stub/Mock Component) */
              <div className="flex min-h-0 flex-1 flex-col bg-(--bg-canvas,#161F29)">
                {/* Document Viewer Control Bar */}
                <div className="flex items-center justify-between border-b border-(--line-soft,#1B2530) bg-(--bg-panel,#121A23)/40 px-4 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-(--tx,#DCE3EA)">
                      {activeDocument.name}
                    </span>
                    <span className="rounded bg-(--bg-raise,#1C2833) px-2 py-0.5 font-mono text-[10px] text-(--tx-faint,#5C6976)">
                      {activeDocument.size} · {activeDocument.totalPages} pages
                    </span>
                  </div>

                  {/* Viewer Controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 rounded border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-2 py-0.5">
                      <button
                        type="button"
                        disabled={activePage <= 1}
                        onClick={() => setPageOverride(Math.max(1, activePage - 1))}
                        className="cursor-pointer text-(--tx-dim,#8B98A7) hover:text-white disabled:opacity-40"
                      >
                        ◀
                      </button>
                      <span className="px-1 font-mono text-[11px]">
                        Page {activePage} of {activeDocument.totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={activePage >= activeDocument.totalPages}
                        onClick={() =>
                          setPageOverride(
                            Math.min(activeDocument.totalPages, activePage + 1)
                          )
                        }
                        className="cursor-pointer text-(--tx-dim,#8B98A7) hover:text-white disabled:opacity-40"
                      >
                        ▶
                      </button>
                    </div>

                    <div className="flex items-center gap-1 rounded border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-2 py-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomLevel((z) => Math.max(50, z - 10))
                        }
                        className="cursor-pointer text-(--tx-dim,#8B98A7) hover:text-white"
                      >
                        -
                      </button>
                      <span className="px-1 font-mono text-[11px]">
                        {zoomLevel}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setZoomLevel((z) => Math.min(150, z + 10))
                        }
                        className="cursor-pointer text-(--tx-dim,#8B98A7) hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Document Canvas Content Area */}
                <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-(--bg-canvas,#161F29) p-6">
                  {/* Citation Highlight Banner if active */}
                  {selectedCitation && (
                    <div className="mb-4 flex w-full max-w-2xl animate-in items-center justify-between rounded-lg border border-(--cite-line,rgba(227,166,63,0.38)) bg-(--cite-bg,rgba(227,166,63,0.09)) p-3 text-xs text-(--cite,#E3A63F) fade-in">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-(--cite,#E3A63F)" />
                        <span>
                          <strong>Citation Evidence:</strong>{" "}
                          {selectedCitation.l} (Page {selectedCitation.p})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCitation(null)}
                        className="cursor-pointer text-xs hover:text-white"
                      >
                        Dismiss ✕
                      </button>
                    </div>
                  )}

                  {/* Simulated Document Page Sheet */}
                  <div
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: "top center",
                    }}
                    className="flex min-h-125 w-full max-w-2xl flex-col gap-4 rounded-lg border border-(--line,#25313E) bg-(--bg-panel,#121A23) p-8 text-xs leading-relaxed text-(--tx,#DCE3EA) shadow-xl transition-transform duration-150"
                  >
                    <div className="flex items-center justify-between border-b border-(--line-soft,#1B2530) pb-3 font-mono text-[10px] text-(--tx-faint,#5C6976)">
                      <span>{activeDocument.name}</span>
                      <span>
                        Page {activePage} / {activeDocument.totalPages}
                      </span>
                    </div>

                    {/* Page Content Display */}
                    <div className="flex flex-col gap-3">
                      {activeDocument.contentByPage?.[activePage] ? (
                        <div className="space-y-3">
                          <p className="whitespace-pre-line text-(--tx,#DCE3EA)">
                            {activeDocument.contentByPage[activePage]}
                          </p>

                          {/* Highlight quote if citation corresponds to this document & page */}
                          {selectedCitation?.quote && (
                            <div className="rounded border border-(--cite-line,rgba(227,166,63,0.4)) bg-(--cite-bg,rgba(227,166,63,0.12)) p-3 text-(--tx-strong,#EDF2F6) shadow-sm">
                              <span className="mb-1 block font-mono text-[10px] font-semibold text-(--cite,#E3A63F) uppercase">
                                Verified Grounded Quote
                              </span>
                              <em>"{selectedCitation.quote}"</em>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <h4 className="text-sm font-semibold text-(--acc,#52A8EA)">
                            Section {activePage}.1 — Core Theoretical
                            Foundations
                          </h4>
                          <p className="text-(--tx-dim,#8B98A7)">
                            This document contains comprehensive materials for{" "}
                            {currentCourse.code} ({currentCourse.name}). All
                            paragraphs and equations in this section are indexed
                            by the Retrieval-Augmented Generation (RAG) pipeline
                            for verified citation and context retrieval.
                          </p>
                          <div className="rounded border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833) p-3 font-mono text-[11px] text-(--tx-faint,#5C6976)">
                            [Indexed Chunk #{activeCourseId}-{activeDocument.id}
                            -p{activePage}]
                            <br />
                            Embedding vectors synced with vector store and ready
                            for query matching.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* EMPTY / COURSE OVERVIEW HERO SCREEN */
              <div className="my-auto flex flex-1 flex-col items-center justify-center overflow-y-auto p-8 text-center">
                <div className="flex max-w-md flex-col items-center gap-4">
                  <img
                    src="/ntbc-logo.png"
                    alt="NotToBeCooked Logo"
                    className="h-16 w-16 object-contain"
                  />
                  <div>
                    <h2 className="text-lg font-bold text-(--tx,#DCE3EA)">
                      {currentCourse.code} — {currentCourse.name}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-(--tx-dim,#8B98A7)">
                      {currentCourse.description}
                    </p>
                  </div>

                  <div className="mt-2 grid w-full grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (courseFiles.length > 0 && courseFiles[0]) {
                          handleOpenFile(courseFiles[0])
                        }
                      }}
                      className="group cursor-pointer rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) p-3 text-left transition-colors hover:border-(--acc,#52A8EA)"
                    >
                      <span className="block text-xs font-semibold text-(--tx,#DCE3EA) group-hover:text-(--acc,#52A8EA)">
                        Open Recent Lecture
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-(--tx-faint,#5C6976)">
                        {courseFiles[0]?.name || "Select document"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        showToast("Simulated document ingestion triggered.")
                      }
                      className="group cursor-pointer rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) p-3 text-left transition-colors hover:border-(--acc,#52A8EA)"
                    >
                      <span className="block text-xs font-semibold text-(--tx,#DCE3EA) group-hover:text-(--acc,#52A8EA)">
                        Add Course Material
                      </span>
                      <span className="mt-0.5 block text-[10px] text-(--tx-faint,#5C6976)">
                        Upload PDF notes or lab
                      </span>
                    </button>
                  </div>

                  <p className="text-[11px] text-(--tx-faint,#5C6976)">
                    Select a document on the left or ask the AI Assistant on the
                    right with grounded citations.
                  </p>
                </div>
              </div>
            )}
          </main>

          {/* Right Pane: AI Chat Assistant (F3) */}
          <Chat
            courseCode={currentCourse.code}
            filesCount={courseFiles.length}
            files={courseFiles}
            categories={CATEGORIES}
            messages={messages}
            sessions={sessions}
            activeSessionId={activeConversationId}
            isTyping={isSending || isLoadingMessages}
            onSendMessage={handleSendMessage}
            onSelectSession={(id) => selectSession(id)}
            onDeleteSession={(id) => deleteSession(id)}
            onNewChat={() => startNewChat()}
            onOpenDocument={handleOpenDocumentFromChat}
            onCiteClick={handleCitationClick}
          />
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
