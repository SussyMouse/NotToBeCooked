import { useState, useMemo, useEffect } from "react"
import { useAuth } from "../context/auth-context"
import {
  useWorkspace,
  selectTabs,
  selectActiveCourse,
} from "../store/workspace"
import { useChatSession } from "../hooks/useChatSession"
import Chat, { type CitationItem } from "../components/chat/Chat"
import { TopBar } from "../components/topbar/TopBar"
import { FileExplorer } from "../components/explorer/FileExplorer"
import { RoadmapModal } from "../components/roadmap/RoadmapModal"
import { UploadModal } from "../components/upload/UploadModal"
import type { MockCourse, MockDocumentFile } from "../types/course"

export interface DashboardPageProps {
  platform?: "web" | "tauri"
}

// ---------------------------------------------------------------------------
// Mock / Stub Course Catalog & File Repository for Development and Testing
// ---------------------------------------------------------------------------
const MOCK_COURSES: MockCourse[] = [
  {
    id: "c2020000-0000-4000-8000-000000000202",
    code: "CS202",
    name: "Software Engineering",
    year: 2,
    semester: 2,
    week: 5,
    weeks: 14,
    target: "finish Lab 3 and read Lecture 4 before Friday",
    description:
      "Design patterns, architecture, agile methodologies, and testing.",
    roadmap: [
      { w: "Week 1", n: "Complexity analysis & asymptotic notation", s: 1 },
      { w: "Week 2", n: "Cost models and empirical timing", s: 1 },
      { w: "Week 3", n: "Arrays & dynamic arrays", s: 1 },
      { w: "Week 4", n: "Linked lists, stacks & queues", s: 1 },
      { w: "Week 4", n: "Tutorial 1 submission", s: 1 },
      {
        w: "Week 5",
        n: "Sorting — QuickSort, MergeSort, HeapSort",
        s: 0,
        now: true,
      },
      { w: "Week 5", n: "Lab 3 — State Management & Hooks", s: 0, now: true },
      { w: "Week 6", n: "Binary search trees & self-balancing trees", s: 0 },
      { w: "Week 7", n: "Heaps & priority queues", s: 0 },
      { w: "Week 8", n: "Midterm examination", s: 0, tag: "exam" },
      { w: "Week 9", n: "Graphs & topological traversal", s: 0 },
      { w: "Week 11", n: "Hashing & collision resolution", s: 0 },
      { w: "Week 14", n: "Final examination", s: 0, tag: "exam" },
    ],
  },
  {
    id: "c2100000-0000-4000-8000-000000000210",
    code: "CS210",
    name: "Data Structures & Algorithms",
    year: 2,
    semester: 2,
    week: 5,
    weeks: 14,
    target: "submit Lab 2 and start the graph algorithms problem set",
    description: "Trees, graphs, dynamic programming, and complexity analysis.",
    roadmap: [
      { w: "Week 1", n: "Relational model & key constraints", s: 1 },
      { w: "Week 2", n: "Relational algebra & calculus", s: 1 },
      { w: "Week 3", n: "Lab 1 — Red-Black trees implementation", s: 1 },
      { w: "Week 5", n: "Graph algorithms & network flow", s: 0, now: true },
      { w: "Week 7", n: "Project schema design draft", s: 0 },
      { w: "Week 9", n: "B+ Trees & indexing structures", s: 0 },
      { w: "Week 14", n: "Final examination", s: 0, tag: "exam" },
    ],
  },
  {
    id: "a2010000-0000-4000-8000-000000000201",
    code: "MA201",
    name: "Linear Algebra & Probability",
    year: 2,
    semester: 1,
    week: 4,
    weeks: 14,
    target: "complete Problem Set 2 on eigenvalues before tutorial",
    description: "Vector spaces, eigenvalues, SVD, and Bayesian inference.",
    roadmap: [
      { w: "Week 1", n: "Vector spaces and subspaces", s: 1 },
      { w: "Week 2", n: "Linear independence and basis", s: 1 },
      { w: "Week 3", n: "Eigenvalues & diagonalization", s: 1 },
      { w: "Week 4", n: "Singular Value Decomposition (SVD)", s: 0, now: true },
      { w: "Week 8", n: "Midterm examination", s: 0, tag: "exam" },
      { w: "Week 14", n: "Final examination", s: 0, tag: "exam" },
    ],
  },
  {
    id: "c1010000-0000-4000-8000-000000000101",
    code: "CS101",
    name: "Computer Systems & Architecture",
    year: 1,
    semester: 1,
    week: 6,
    weeks: 14,
    target: "review cache hierarchy and practice assembly tracing",
    description: "Digital logic, CPU pipeline, cache hierarchy, and assembly.",
    roadmap: [
      { w: "Week 1", n: "Digital logic gates & boolean algebra", s: 1 },
      { w: "Week 2", n: "CPU pipelines & registers", s: 1 },
      { w: "Week 3", n: "Cache hierarchy & memory mapping", s: 1 },
      { w: "Week 6", n: "Assembly language instructions", s: 0, now: true },
      { w: "Week 14", n: "Final examination", s: 0, tag: "exam" },
    ],
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

export function DashboardPage({ platform = "web" }: DashboardPageProps = {}) {
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
  const [pageOverride, setPageOverride] = useState<number | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modals state (Roadmap & Upload)
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadCategory, setUploadCategory] = useState<string>("Lecture Decks")
  const [isDirectFolderUpload, setIsDirectFolderUpload] = useState(false)

  // Interactive Roadmap Milestone check state
  const [milestoneOverrides, setMilestoneOverrides] = useState<
    Record<string, Record<number, number>>
  >({})

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

  // Active opened document
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.fileId === activeFileId) || null
  }, [tabs, activeFileId])

  const activeDocument = useMemo(() => {
    if (!activeFileId) return null
    return courseFiles.find((f) => f.id === activeFileId) || null
  }, [courseFiles, activeFileId])

  const activePage = pageOverride ?? activeTab?.page ?? 1

  // Roadmap calculations (from workspace.html)
  const courseRoadmap = useMemo(() => {
    const base = currentCourse.roadmap
    const overrides = milestoneOverrides[currentCourse.id] || {}
    return base.map((m, idx) => ({
      ...m,
      s: overrides[idx] !== undefined ? overrides[idx]! : m.s,
    }))
  }, [currentCourse, milestoneOverrides])

  const roadmapStats = useMemo(() => {
    const total = courseRoadmap.length
    const done = courseRoadmap.filter((m) => m.s === 1).length
    const pct = total ? Math.round((done / total) * 100) : 0
    const nowItem =
      courseRoadmap.find((m) => m.now && m.s === 0) ||
      courseRoadmap.find((m) => m.s === 0)
    const nextText = total
      ? nowItem
        ? nowItem.n.split("—")[0]?.trim() || nowItem.n
        : "all clear"
      : "no milestones yet"

    return { done, total, pct, nextText }
  }, [courseRoadmap])

  const toggleMilestone = (idx: number) => {
    setMilestoneOverrides((prev) => {
      const courseMap = { ...(prev[currentCourse.id] || {}) }
      const currentVal =
        courseMap[idx] !== undefined
          ? courseMap[idx]
          : currentCourse.roadmap[idx]?.s || 0
      courseMap[idx] = currentVal === 1 ? 0 : 1
      return {
        ...prev,
        [currentCourse.id]: courseMap,
      }
    })
  }

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
      // Fallback handled in Chat component
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

  const handleOpenBatchUpload = () => {
    setUploadCategory("Lecture Decks")
    setIsDirectFolderUpload(false)
    setIsUploadModalOpen(true)
  }

  const handleOpenDirectFolderUpload = (category: string) => {
    setUploadCategory(category)
    setIsDirectFolderUpload(true)
    setIsUploadModalOpen(true)
  }

  const openedFileIds = useMemo(() => tabs.map((t) => t.fileId), [tabs])

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
        {/* Top Navbar Component */}
        <TopBar
          platform={platform}
          currentCourse={currentCourse}
          courses={MOCK_COURSES}
          userEmail={user?.email}
          onSwitchCourse={(id) => switchCourse(id)}
          onLogout={() => logout()}
        />

        {/* Main 3-Pane Split View */}
        <div className="flex min-h-0 min-w-0 flex-1">
          {/* Left Pane: Structured File Explorer */}
          <FileExplorer
            categories={CATEGORIES}
            files={courseFiles}
            activeFileId={activeFileId}
            openedFileIds={openedFileIds}
            courseWeek={currentCourse.week}
            courseWeeks={currentCourse.weeks}
            roadmapProgressPct={roadmapStats.pct}
            nextMilestoneText={roadmapStats.nextText}
            onOpenFile={handleOpenFile}
            onOpenRoadmapModal={() => setIsRoadmapOpen(true)}
            onOpenBatchUpload={handleOpenBatchUpload}
            onOpenDirectFolderUpload={handleOpenDirectFolderUpload}
          />

          {/* Center Workspace: Tabs & Document Viewer */}
          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-(--bg-canvas,#161F29)">
            {/* Tabs Bar */}
            {tabs.length > 0 && (
              <div className="flex h-10 flex-none scrollbar-none items-center justify-between overflow-x-auto border-b border-(--line,#25313E) bg-(--bg-bar,#101821) px-2">
                <div className="flex items-center gap-1">
                  {tabs.map((tab) => {
                    const isActive = tab.fileId === activeFileId
                    return (
                      <div
                        key={tab.fileId}
                        onClick={() => openTab(activeCourseId, tab)}
                        className={`group flex cursor-pointer items-center gap-2 rounded-t-md px-3.5 py-2 text-xs transition-colors ${
                          isActive
                            ? "border-t-2 border-(--acc,#52A8EA) bg-(--bg-panel,#121A23) font-medium text-(--tx-strong,#EDF2F6)"
                            : "bg-transparent text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040)/40 hover:text-(--tx,#DCE3EA)"
                        }`}
                      >
                        <svg
                          width="13"
                          height="13"
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

                {/* Tabset Tag */}
                <div className="hidden items-center gap-1.5 font-mono text-xs text-(--tx-faint,#5C6976) sm:flex">
                  <span className="font-bold text-(--tx-dim,#8B98A7)">
                    {currentCourse.code}
                  </span>
                  <span>tab set</span>
                </div>
              </div>
            )}

            {/* Document Viewer or Minimal Empty State */}
            {activeDocument ? (
              /* ACTIVE DOCUMENT VIEWER */
              <div className="flex min-h-0 flex-1 flex-col bg-(--bg-canvas,#161F29)">
                {/* Document Viewer Control Bar */}
                <div className="flex items-center justify-between border-b border-(--line-soft,#1B2530) bg-(--bg-panel,#121A23)/40 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-(--tx,#DCE3EA)">
                      {activeDocument.name}
                    </span>
                    <span className="rounded-md bg-(--bg-raise,#1C2833) px-2 py-0.5 font-mono text-[11px] text-(--tx-faint,#5C6976)">
                      {activeDocument.size} · {activeDocument.totalPages} pages
                    </span>
                  </div>

                  {/* Viewer Controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-2.5 py-1 text-xs">
                      <button
                        type="button"
                        disabled={activePage <= 1}
                        onClick={() =>
                          setPageOverride(Math.max(1, activePage - 1))
                        }
                        className="cursor-pointer text-(--tx-dim,#8B98A7) hover:text-white disabled:opacity-40"
                      >
                        ◀
                      </button>
                      <span className="px-1.5 font-mono text-xs">
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

                    <div className="flex items-center gap-1.5 rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-2.5 py-1 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setZoomLevel((z) => Math.max(50, z - 10))
                        }
                        className="cursor-pointer text-(--tx-dim,#8B98A7) hover:text-white"
                      >
                        -
                      </button>
                      <span className="px-1 font-mono text-xs">
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
                    <div className="mb-4 flex w-full max-w-2xl animate-in items-center justify-between rounded-lg border border-(--cite-line,rgba(227,166,63,0.38)) bg-(--cite-bg,rgba(227,166,63,0.09)) p-3.5 text-xs text-(--cite,#E3A63F) fade-in">
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
                    className="flex min-h-125 w-full max-w-2xl flex-col gap-4 rounded-xl border border-(--line,#25313E) bg-(--bg-panel,#121A23) p-8 text-sm leading-relaxed text-(--tx,#DCE3EA) shadow-xl transition-transform duration-150"
                  >
                    <div className="flex items-center justify-between border-b border-(--line-soft,#1B2530) pb-3 font-mono text-xs text-(--tx-faint,#5C6976)">
                      <span>{activeDocument.name}</span>
                      <span>
                        Page {activePage} / {activeDocument.totalPages}
                      </span>
                    </div>

                    {/* Page Content Display */}
                    <div className="flex flex-col gap-3.5">
                      {activeDocument.contentByPage?.[activePage] ? (
                        <div className="space-y-3.5">
                          <p className="text-sm leading-relaxed whitespace-pre-line text-(--tx,#DCE3EA)">
                            {activeDocument.contentByPage[activePage]}
                          </p>

                          {/* Highlight quote if citation corresponds to this document & page */}
                          {selectedCitation?.quote && (
                            <div className="rounded-lg border border-(--cite-line,rgba(227,166,63,0.4)) bg-(--cite-bg,rgba(227,166,63,0.12)) p-3.5 text-xs leading-relaxed text-(--tx-strong,#EDF2F6) shadow-sm">
                              <span className="mb-1 block font-mono text-[11px] font-semibold text-(--cite,#E3A63F) uppercase">
                                Verified Grounded Quote
                              </span>
                              <em>"{selectedCitation.quote}"</em>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <h4 className="text-base font-semibold text-(--acc,#52A8EA)">
                            Section {activePage}.1 — Core Theoretical
                            Foundations
                          </h4>
                          <p className="text-sm leading-relaxed text-(--tx-dim,#8B98A7)">
                            This document contains comprehensive materials for{" "}
                            {currentCourse.code} ({currentCourse.name}). All
                            paragraphs and equations in this section are indexed
                            by the Retrieval-Augmented Generation (RAG) pipeline
                            for verified citation and context retrieval.
                          </p>
                          <div className="rounded-lg border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833) p-3.5 font-mono text-xs text-(--tx-faint,#5C6976)">
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
              /* EMPTY / RECENT LECTURES CENTER VIEW (Minimalist & Borderless) */
              <div className="my-auto flex flex-1 flex-col items-center justify-center overflow-y-auto p-8 text-center">
                <div className="flex w-full max-w-md flex-col items-center gap-6">
                  <img
                    src="/ntbc-logo.png"
                    alt="NotToBeCooked Logo"
                    className="h-16 w-16 object-contain opacity-90"
                  />

                  {/* Recently Opened / Available Lectures List */}
                  {courseFiles.length > 0 && (
                    <div className="flex w-full flex-col items-center gap-2.5">
                      <span className="text-center font-mono text-[11px] font-semibold tracking-widest text-(--tx-faint,#5C6976) uppercase">
                        Recent Lectures & Materials
                      </span>
                      <div className="flex w-full flex-col gap-1">
                        {courseFiles.slice(0, 4).map((file) => (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => handleOpenFile(file)}
                            className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3.5 py-2 text-left transition-colors hover:bg-(--bg-hover,#213040)/50"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              <svg
                                width="14"
                                height="14"
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
                              <span className="truncate text-xs font-medium text-(--tx-dim,#8B98A7) group-hover:text-(--tx,#DCE3EA)">
                                {file.name}
                              </span>
                            </div>
                            <span className="shrink-0 font-mono text-xs text-(--tx-faint,#5C6976) group-hover:text-(--tx-dim,#8B98A7)">
                              {file.size}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Right Pane: AI Chat Assistant */}
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

      {/* Learning Roadmap Modal Component */}
      <RoadmapModal
        isOpen={isRoadmapOpen}
        course={currentCourse}
        roadmap={courseRoadmap}
        progressPct={roadmapStats.pct}
        doneCount={roadmapStats.done}
        totalCount={roadmapStats.total}
        onToggleMilestone={toggleMilestone}
        onClose={() => setIsRoadmapOpen(false)}
      />

      {/* Batch / Direct Folder Upload Modal Component */}
      <UploadModal
        isOpen={isUploadModalOpen}
        courseCode={currentCourse.code}
        categories={CATEGORIES}
        initialCategory={uploadCategory}
        isDirectFolderUpload={isDirectFolderUpload}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(category) => {
          showToast(`Uploaded document to ${category}.`)
        }}
      />
    </div>
  )
}

export default DashboardPage
