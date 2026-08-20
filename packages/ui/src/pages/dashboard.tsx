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
import { TabBar } from "../components/tabs"
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
      name: "Lecture 4 - Architectural Patterns & Component Decoupling.pdf",
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
      id: "f2020005-0000-4000-8000-000000000005",
      name: "Lecture 5 - Advanced Distributed Systems, Consensus Protocols & Raft Architecture (Spring 2026 Comprehensive Edition).pdf",
      category: "Lecture Decks",
      totalPages: 56,
      uploadedAt: "Yesterday",
      size: "6.8 MB",
      contentByPage: {
        1: "Lecture 5: Distributed Consensus and Fault Tolerance\n\nKey Topics:\n- The CAP Theorem in modern cloud deployments\n- Leader election and log replication with Raft\n- Byzantine Fault Tolerance (BFT) fundamentals",
        12: "Raft Leader Election:\nFollowers increment their term and transition to candidate state if no heartbeat is received within the randomized election timeout window.",
        24: "Log Replication & Safety Invariants:\nOnce an entry is committed by a majority of cluster nodes, it is guaranteed to survive subsequent leader failovers.",
        48: "Network Partition Scenarios (Split-Brain):\nHow quorum consensus guarantees that a minority partition cannot commit writes independently.",
      },
    },
    {
      id: "f2020001-0000-4000-8000-000000000001",
      name: "Lecture 1 - SOLID Principles & OOP Fundamentals.pdf",
      category: "Lecture Decks",
      totalPages: 24,
      uploadedAt: "1 week ago",
      size: "1.8 MB",
      contentByPage: {
        1: "Lecture 1: SOLID Principles & Object-Oriented Design\n\nSingle Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.",
        5: "Single Responsibility Principle (SRP):\nA module or class should have one, and only one, reason to change.",
        15: "Liskov Substitution Principle (LSP):\nFunctions that use pointers or references to base classes must be able to use objects of derived classes without knowing it.",
      },
    },
    {
      id: "f2020002-0000-4000-8000-000000000020",
      name: "Lecture 2 - Object-Oriented Domain Modeling, UML Class Diagrams & Design Heuristics.pdf",
      category: "Lecture Decks",
      totalPages: 28,
      uploadedAt: "6 days ago",
      size: "2.1 MB",
      contentByPage: {
        1: "Lecture 2: Domain Modeling & UML Design\n\nRepresenting entity relationships, aggregation vs composition, and state machine transitions.",
      },
    },
    {
      id: "f2020003-0000-4000-8000-000000000003",
      name: "Lab 3 - State Management & Reactive UI Hooks.pdf",
      category: "Lab Handouts",
      totalPages: 14,
      uploadedAt: "3 days ago",
      size: "1.2 MB",
      contentByPage: {
        1: "Lab 3 Instructions: Integrating Zustand with React\n\nTask: Build a multi-pane layout syncing tab state across separate component trees.",
        4: "Exercise 2: Fine-Grained Selectors and Memoization\nEnsure that active document switching does not trigger re-renders in unmounted sidebar components.",
      },
    },
    {
      id: "f2020004-0000-4000-8000-000000000040",
      name: "Lab 4 - Full-Stack Concurrent State Synchronization & Optimistic UI Updates in Distributed React Applications.pdf",
      category: "Lab Handouts",
      totalPages: 18,
      uploadedAt: "2 days ago",
      size: "1.9 MB",
      contentByPage: {
        1: "Lab 4: Optimistic Concurrency and Conflict Resolution\n\nBuilding responsive UI states with rollback mechanisms when network requests fail.",
      },
    },
    {
      id: "f2020002-0000-4000-8000-000000000002",
      name: "Tutorial 1 - Component Testing & Mocking Frameworks.pdf",
      category: "Tutorials & PYQs",
      totalPages: 10,
      uploadedAt: "5 days ago",
      size: "1.1 MB",
      contentByPage: {
        1: "Tutorial 1: Testing and Mocking in TypeScript\n\nExercise: How to test components with external backend dependencies using stubs and mocks.",
      },
    },
    {
      id: "f2020003-0000-4000-8000-000000000030",
      name: "Tutorial 3 - Microservices Decomposition, Domain-Driven Design (DDD) Bounded Contexts & Event Sourcing Case Studies.pdf",
      category: "Tutorials & PYQs",
      totalPages: 22,
      uploadedAt: "3 days ago",
      size: "3.4 MB",
      contentByPage: {
        1: "Tutorial 3: DDD Bounded Contexts & CQRS\n\nCase study on breaking down monolithic architectures into decoupled microservices.",
      },
    },
    {
      id: "f2020025-0000-4000-8000-000000000025",
      name: "Midterm Examination 2025 Comprehensive Solutions & Examiner Commentary.pdf",
      category: "Tutorials & PYQs",
      totalPages: 20,
      uploadedAt: "2 weeks ago",
      size: "4.2 MB",
      contentByPage: {
        1: "CS202 Midterm Examination 2025 — Official Solutions\n\nSection A: Multiple Choice Questions\nSection B: Architecture & Design Pattern Problems",
      },
    },
    {
      id: "f2020099-0000-4000-8000-000000000099",
      name: "Past Year Final Examination 2023-2024 Semester 2 With Detailed Worked Solutions.pdf",
      category: "Tutorials & PYQs",
      totalPages: 36,
      uploadedAt: "1 month ago",
      size: "5.1 MB",
    },
    {
      id: "f2020000-0000-4000-8000-000000000000",
      name: "Course Planner, Learning Outcomes & Syllabus 2026.pdf",
      category: "Course Planner",
      totalPages: 6,
      uploadedAt: "1 month ago",
      size: "620 KB",
      contentByPage: {
        1: "CS202 Software Engineering (AY2025/2026 Semester 2)\n\nInstructor: Prof. Alan Turing\nPrerequisites: CS101, CS102",
      },
    },
    {
      id: "f2020088-0000-4000-8000-000000000088",
      name: "Software Engineering Capstone Team Project Specification Guidelines & Grading Rubric (v3.4 Final Release).pdf",
      category: "Course Planner",
      totalPages: 44,
      uploadedAt: "3 weeks ago",
      size: "4.8 MB",
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
  const setActiveFile = useWorkspace((s) => s.setActiveFile)
  const updateTabViewState = useWorkspace((s) => s.updateTabViewState)
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
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isWorkspaceFullscreen, setIsWorkspaceFullscreen] =
    useState<boolean>(false)

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

  // Repository of all files across all courses
  const allFiles = useMemo(() => {
    return Object.values(MOCK_FILES_BY_COURSE).flat()
  }, [])

  // Active opened document (can be from any course)
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.fileId === activeFileId) || null
  }, [tabs, activeFileId])

  const activeDocument = useMemo(() => {
    if (!activeFileId) return null
    return allFiles.find((f) => f.id === activeFileId) || null
  }, [allFiles, activeFileId])

  // Individual per-tab view state
  const activePage = activeTab?.page ?? 1
  const activeZoom = activeTab?.zoomLevel ?? 100

  // Roadmap calculations (from workspace.html)
  const courseRoadmap = useMemo(() => {
    const base = currentCourse.roadmap
    const overrides = milestoneOverrides[currentCourse.id] || {}
    const overridesForCourse = overrides
    return base.map((m, idx) => ({
      ...m,
      s: overridesForCourse[idx] !== undefined ? overridesForCourse[idx]! : m.s,
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

  // Handlers for document & chat interaction
  const handleOpenFile = (file: MockDocumentFile) => {
    openTab(activeCourseId, {
      fileId: file.id,
      filename: file.name,
      page: null,
    })
    setSelectedCitation(null)
  }

  const handleCitationClick = (cite: CitationItem) => {
    setSelectedCitation(cite)
    const targetFile = allFiles.find((f) => f.id === cite.f) || {
      id: cite.f,
      name: cite.l.split(" · ")[0] || "Referenced Document.pdf",
    }

    openCitation(activeCourseId, cite.f, targetFile.name, cite.p)
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
    const targetFile = allFiles.find((f) => f.id === fileId)
    openTab(activeCourseId, {
      fileId,
      filename: targetFile?.name || fileId,
      page,
    })
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
          {!isWorkspaceFullscreen && (
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
          )}

          {/* Center Workspace: Tabs & Document Viewer */}
          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-(--bg-canvas,#161F29)">
            {/* Tabs Bar */}
            <TabBar
              tabs={tabs}
              activeFileId={activeFileId}
              onSelectTab={(tab) => setActiveFile(activeCourseId, tab.fileId)}
              onCloseTab={(fileId) => closeTab(activeCourseId, fileId)}
              rightActions={
                <button
                  type="button"
                  onClick={() =>
                    setIsWorkspaceFullscreen(!isWorkspaceFullscreen)
                  }
                  title={
                    isWorkspaceFullscreen
                      ? "Restore normal view"
                      : "Full screen workspace"
                  }
                  className={`flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors ${
                    isWorkspaceFullscreen
                      ? "bg-(--acc,#52A8EA)/15 text-(--acc,#52A8EA)"
                      : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-white"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    {isWorkspaceFullscreen ? (
                      <path
                        d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      <path
                        d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                </button>
              }
            />

            {/* Document Viewer or Minimal Empty State */}
            {activeDocument ? (
              /* ACTIVE DOCUMENT VIEWER - DIRECT FULL WORKSPACE CANVAS */
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

                  {/* Viewer Controls (No duplicate fullscreen button) */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-2.5 py-1 text-xs">
                      <button
                        type="button"
                        disabled={activePage <= 1}
                        onClick={() => {
                          if (activeFileId) {
                            updateTabViewState(activeCourseId, activeFileId, {
                              page: Math.max(1, activePage - 1),
                            })
                          }
                        }}
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
                        onClick={() => {
                          if (activeFileId) {
                            updateTabViewState(activeCourseId, activeFileId, {
                              page: Math.min(
                                activeDocument.totalPages,
                                activePage + 1
                              ),
                            })
                          }
                        }}
                        className="cursor-pointer text-(--tx-dim,#8B98A7) hover:text-white disabled:opacity-40"
                      >
                        ▶
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-2.5 py-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeFileId) {
                            updateTabViewState(activeCourseId, activeFileId, {
                              zoomLevel: Math.max(50, activeZoom - 10),
                            })
                          }
                        }}
                        className="cursor-pointer text-(--tx-dim,#8B98A7) hover:text-white"
                      >
                        -
                      </button>
                      <span className="px-1 font-mono text-xs">
                        {activeZoom}%
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeFileId) {
                            updateTabViewState(activeCourseId, activeFileId, {
                              zoomLevel: Math.min(150, activeZoom + 10),
                            })
                          }
                        }}
                        className="cursor-pointer text-(--tx-dim,#8B98A7) hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Document Canvas Content Area - Direct full workspace (No border/cards) */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-(--bg-canvas,#161F29) p-6 md:p-8 lg:p-10">
                  {/* Citation Highlight Banner if active */}
                  {selectedCitation && (
                    <div className="mb-6 flex w-full animate-in items-center justify-between rounded-lg border border-(--cite-line,rgba(227,166,63,0.38)) bg-(--cite-bg,rgba(227,166,63,0.09)) p-3.5 text-xs text-(--cite,#E3A63F) fade-in">
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

                  {/* Direct Document Reading Content Area */}
                  <div
                    style={{
                      transform: `scale(${activeZoom / 100})`,
                      transformOrigin: "top left",
                    }}
                    className="flex flex-1 flex-col gap-6 text-sm leading-relaxed text-(--tx,#DCE3EA) transition-transform duration-150"
                  >
                    <div className="flex items-center justify-between border-b border-(--line-soft,#1B2530) pb-4 font-mono text-xs text-(--tx-faint,#5C6976)">
                      <span className="font-semibold text-(--tx,#DCE3EA)">
                        {activeDocument.name}
                      </span>
                      <span>
                        Page {activePage} / {activeDocument.totalPages}
                      </span>
                    </div>

                    {/* Page Content Display */}
                    <div className="flex flex-1 flex-col gap-4">
                      {activeDocument.contentByPage?.[activePage] ? (
                        <div className="space-y-4">
                          <p className="text-sm leading-relaxed whitespace-pre-line text-(--tx,#DCE3EA)">
                            {activeDocument.contentByPage[activePage]}
                          </p>

                          {/* Highlight quote if citation corresponds to this document & page */}
                          {selectedCitation?.quote && (
                            <div className="rounded-lg border border-(--cite-line,rgba(227,166,63,0.4)) bg-(--cite-bg,rgba(227,166,63,0.12)) p-4 text-xs leading-relaxed text-(--tx-strong,#EDF2F6) shadow-sm">
                              <span className="mb-1.5 block font-mono text-[11px] font-semibold text-(--cite,#E3A63F) uppercase">
                                Verified Grounded Quote
                              </span>
                              <em>"{selectedCitation.quote}"</em>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-1 flex-col gap-4">
                          <h4 className="text-base font-semibold text-(--acc,#52A8EA)">
                            Section {activePage}.1 — Core Theoretical
                            Foundations
                          </h4>
                          <p className="text-sm leading-relaxed text-(--tx-dim,#8B98A7)">
                            This document contains comprehensive materials for{" "}
                            {activeDocument.name}. All paragraphs and equations
                            in this section are indexed by the
                            Retrieval-Augmented Generation (RAG) pipeline for
                            verified citation and context retrieval.
                          </p>
                          <div className="mt-auto rounded-lg border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833)/60 p-4 font-mono text-xs text-(--tx-faint,#5C6976)">
                            [Indexed Document Chunk #{activeDocument.id}-p
                            {activePage}]
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
          {!isWorkspaceFullscreen && (
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
          )}
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
