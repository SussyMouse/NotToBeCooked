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
import { DocumentViewer } from "../components/workspace/DocumentViewer"
import { Maximize2, Minimize2, FileText } from "lucide-react"
import type { FileStatus, MockCourse, MockDocumentFile } from "../types/course"

export interface DashboardPageProps {
  platform?: "web" | "tauri"
}

/** Utility hook to manage an LRU list of IDs up to a maximum capacity */
function useLruList(
  activeItem: string | null,
  validItems: string[],
  maxCapacity = 4
): string[] {
  const [cached, setCached] = useState<string[]>([])
  const [prevActive, setPrevActive] = useState<string | null>(null)

  if (activeItem !== prevActive) {
    setPrevActive(activeItem)
    if (activeItem) {
      const validSet = new Set(validItems)
      const next = [
        activeItem,
        ...cached.filter((id) => id !== activeItem && validSet.has(id)),
      ].slice(0, maxCapacity)
      setCached(next)
    }
  }

  const validSet = new Set(validItems)
  return cached.filter((id) => validSet.has(id))
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
      status: "ready",
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
      status: "processing",
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
      status: "failed",
      errorMessage: "No extractable content was found.",
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
      status: "uploaded",
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

interface MockFolder {
  name: string
  parentFolder: string | null
}

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
  const renameFileReferences = useWorkspace((s) => s.renameFileReferences)
  const closeTab = useWorkspace((s) => s.closeTab)
  const setActiveFile = useWorkspace((s) => s.setActiveFile)
  const updateTabViewState = useWorkspace((s) => s.updateTabViewState)
  const openCitation = useWorkspace((s) => s.openCitation)
  const [fileNameOverrides, setFileNameOverrides] = useState<
    Record<string, string>
  >({})
  const [fileFolderOverrides, setFileFolderOverrides] = useState<
    Record<string, string>
  >({})
  const [fileStatusOverrides, setFileStatusOverrides] = useState<
    Record<string, FileStatus>
  >({})
  const [customFoldersByCourse, setCustomFoldersByCourse] = useState<
    Record<string, MockFolder[]>
  >({})
  const [folderNameOverridesByCourse, setFolderNameOverridesByCourse] =
    useState<Record<string, Record<string, string>>>({})
  const [deletedBaseFoldersByCourse, setDeletedBaseFoldersByCourse] = useState<
    Record<string, string[]>
  >({})
  // Repository of all files across all courses
  const allFiles = useMemo(() => {
    return Object.values(MOCK_FILES_BY_COURSE)
      .flat()
      .map((file) => ({
        ...file,
        name: fileNameOverrides[file.id] ?? file.name,
        category: fileFolderOverrides[file.id] ?? file.category,
        status: fileStatusOverrides[file.id] ?? file.status,
      }))
  }, [fileFolderOverrides, fileNameOverrides, fileStatusOverrides])

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
  } = useChatSession(activeCourseId, allFiles)

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

  // LRU Document Viewer Cache (keeps up to 4 recent document DOM trees mounted)
  const tabFileIds = useMemo(() => tabs.map((t) => t.fileId), [tabs])
  const cachedFileIds = useLruList(activeFileId, tabFileIds, 4)

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

  const folderNameOverrides = useMemo(
    () => folderNameOverridesByCourse[currentCourse.id] ?? {},
    [currentCourse.id, folderNameOverridesByCourse]
  )

  const deletedBaseFolders = useMemo(
    () => deletedBaseFoldersByCourse[currentCourse.id] ?? [],
    [currentCourse.id, deletedBaseFoldersByCourse]
  )

  const customFolders = useMemo(
    () => customFoldersByCourse[currentCourse.id] ?? [],
    [currentCourse.id, customFoldersByCourse]
  )

  const baseFolderNames = useMemo(
    () =>
      CATEGORIES.filter(
        (folderName) => !deletedBaseFolders.includes(folderName)
      ).map((folderName) => folderNameOverrides[folderName] ?? folderName),
    [deletedBaseFolders, folderNameOverrides]
  )

  const courseCategories = useMemo(
    () => [...baseFolderNames, ...customFolders.map((folder) => folder.name)],
    [baseFolderNames, customFolders]
  )

  const folderParents = useMemo(
    () =>
      Object.fromEntries([
        ...baseFolderNames.map((folderName) => [folderName, null]),
        ...customFolders.map((folder) => [folder.name, folder.parentFolder]),
      ]) as Record<string, string | null>,
    [baseFolderNames, customFolders]
  )

  const courseFiles = useMemo(() => {
    const files =
      MOCK_FILES_BY_COURSE[currentCourse.id] ||
      MOCK_FILES_BY_COURSE[currentCourse.code] ||
      []

    return files.map((file) => ({
      ...file,
      name: fileNameOverrides[file.id] ?? file.name,
      category: fileFolderOverrides[file.id] ?? file.category,
      status: fileStatusOverrides[file.id] ?? file.status,
    }))
  }, [
    currentCourse,
    fileFolderOverrides,
    fileNameOverrides,
    fileStatusOverrides,
  ])

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

  const handleRenameFile = (fileId: string, newFileName: string) => {
    setFileNameOverrides((current) => ({
      ...current,
      [fileId]: newFileName,
    }))

    renameFileReferences(fileId, newFileName)
    showToast(`Renamed to ${newFileName}`)
  }

  const handleMoveFile = (fileId: string, destinationFolder: string) => {
    setFileFolderOverrides((current) => ({
      ...current,
      [fileId]: destinationFolder,
    }))

    showToast(`Moved file to ${destinationFolder}`)
  }

  const handleRetryIndexing = (fileId: string) => {
    setFileStatusOverrides((current) => ({
      ...current,
      [fileId]: "processing",
    }))

    showToast("Indexing restarted in the background")
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

  const handleCreateSubfolder = (parentFolder: string, folderName: string) => {
    const folderAlreadyExists = courseCategories.some(
      (category) => category.toLowerCase() === folderName.toLowerCase()
    )

    if (folderAlreadyExists) {
      throw new Error("Folder already exists")
    }

    setCustomFoldersByCourse((current) => ({
      ...current,
      [currentCourse.id]: [
        ...(current[currentCourse.id] ?? []),
        {
          name: folderName,
          parentFolder,
        },
      ],
    }))

    showToast(`Created ${folderName} inside ${parentFolder}`)
  }

  const handleRenameFolder = (folderName: string, newFolderName: string) => {
    const duplicateExists = courseCategories.some(
      (category) =>
        category !== folderName &&
        category.toLowerCase() === newFolderName.toLowerCase()
    )

    if (duplicateExists) throw new Error("Folder already exists")

    const originalBaseFolder = CATEGORIES.find(
      (originalName) =>
        (folderNameOverrides[originalName] ?? originalName) === folderName
    )

    if (originalBaseFolder) {
      setFolderNameOverridesByCourse((current) => ({
        ...current,
        [currentCourse.id]: {
          ...(current[currentCourse.id] ?? {}),
          [originalBaseFolder]: newFolderName,
        },
      }))
    }

    setCustomFoldersByCourse((current) => ({
      ...current,
      [currentCourse.id]: (current[currentCourse.id] ?? []).map((folder) => ({
        ...folder,
        name: folder.name === folderName ? newFolderName : folder.name,
        parentFolder:
          folder.parentFolder === folderName
            ? newFolderName
            : folder.parentFolder,
      })),
    }))

    setFileFolderOverrides((current) => {
      const next = { ...current }
      courseFiles.forEach((file) => {
        if (file.category === folderName) next[file.id] = newFolderName
      })
      return next
    })

    showToast(`Renamed ${folderName} to ${newFolderName}`)
  }

  const handleDeleteFolder = (folderName: string) => {
    const hasFiles = courseFiles.some((file) => file.category === folderName)
    const hasChildren = customFolders.some(
      (folder) => folder.parentFolder === folderName
    )

    if (hasFiles || hasChildren) {
      throw new Error("Folder is not empty")
    }

    const originalBaseFolder = CATEGORIES.find(
      (originalName) =>
        (folderNameOverrides[originalName] ?? originalName) === folderName
    )

    if (originalBaseFolder) {
      setDeletedBaseFoldersByCourse((current) => ({
        ...current,
        [currentCourse.id]: [
          ...(current[currentCourse.id] ?? []),
          originalBaseFolder,
        ],
      }))
    } else {
      setCustomFoldersByCourse((current) => ({
        ...current,
        [currentCourse.id]: (current[currentCourse.id] ?? []).filter(
          (folder) => folder.name !== folderName
        ),
      }))
    }

    showToast(`Deleted ${folderName}`)
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
              categories={courseCategories}
              folderParents={folderParents}
              files={courseFiles}
              activeFileId={activeFileId}
              courseWeek={currentCourse.week}
              courseWeeks={currentCourse.weeks}
              roadmapProgressPct={roadmapStats.pct}
              nextMilestoneText={roadmapStats.nextText}
              onOpenFile={handleOpenFile}
              onRenameFile={handleRenameFile}
              onMoveFile={handleMoveFile}
              onRetryIndexing={handleRetryIndexing}
              onOpenRoadmapModal={() => setIsRoadmapOpen(true)}
              onOpenBatchUpload={handleOpenBatchUpload}
              onOpenDirectFolderUpload={handleOpenDirectFolderUpload}
              onCreateSubfolder={handleCreateSubfolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
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
                  {isWorkspaceFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </button>
              }
            />

            {/* Document Viewers (LRU DOM Cache) or Minimal Empty State */}
            {cachedFileIds.length > 0 && tabs.length > 0 ? (
              cachedFileIds.map((fileId) => {
                const doc = allFiles.find((f) => f.id === fileId)
                const tab = tabs.find((t) => t.fileId === fileId)
                if (!doc || !tab) return null

                return (
                  <DocumentViewer
                    key={fileId}
                    document={doc}
                    tab={tab}
                    isVisible={fileId === activeFileId}
                    onPageChange={(newPage) =>
                      updateTabViewState(activeCourseId, fileId, {
                        page: newPage,
                      })
                    }
                    onZoomChange={(newZoom) =>
                      updateTabViewState(activeCourseId, fileId, {
                        zoomLevel: newZoom,
                      })
                    }
                    selectedCitation={selectedCitation}
                    onDismissCitation={() => setSelectedCitation(null)}
                  />
                )
              })
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
                              <FileText className="h-3.5 w-3.5 shrink-0 text-(--tx-faint,#5C6976) group-hover:text-(--acc,#52A8EA)" />
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
              categories={courseCategories}
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
        categories={courseCategories}
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
