import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useWorkspace, selectTabs, selectActiveCourse } from "../store/workspace";
import { useChatSession } from "../hooks/useChatSession";
import Chat, { type CitationItem, type ChatFile } from "../components/chat/Chat";

export interface DashboardPageProps {
  platform?: "web" | "tauri";
}

// ---------------------------------------------------------------------------
// Mock / Stub Course Catalog & File Repository for Development and Testing
// ---------------------------------------------------------------------------
export interface MockCourse {
  code: string;
  name: string;
  year: number;
  semester: number;
  description: string;
}

export interface MockDocumentFile extends ChatFile {
  totalPages: number;
  uploadedAt: string;
  size: string;
  contentByPage?: Record<number, string>;
}

export const MOCK_COURSES: MockCourse[] = [
  {
    code: "CS202",
    name: "Software Engineering",
    year: 2,
    semester: 2,
    description: "Design patterns, architecture, agile methodologies, and testing.",
  },
  {
    code: "CS210",
    name: "Data Structures & Algorithms",
    year: 2,
    semester: 2,
    description: "Trees, graphs, dynamic programming, and complexity analysis.",
  },
  {
    code: "MA201",
    name: "Linear Algebra & Probability",
    year: 2,
    semester: 1,
    description: "Vector spaces, eigenvalues, SVD, and Bayesian inference.",
  },
  {
    code: "CS101",
    name: "Computer Systems & Architecture",
    year: 1,
    semester: 1,
    description: "Digital logic, CPU pipeline, cache hierarchy, and assembly.",
  },
];

export const MOCK_FILES_BY_COURSE: Record<string, MockDocumentFile[]> = {
  CS202: [
    {
      id: "cs202-lec4",
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
      id: "cs202-lec1",
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
      id: "cs202-lab3",
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
      id: "cs202-tut1",
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
      id: "cs202-midterm-2025",
      name: "Midterm Exam 2025 Solutions.pdf",
      category: "Tutorials & PYQs",
      totalPages: 12,
      uploadedAt: "2 weeks ago",
      size: "3.2 MB",
    },
    {
      id: "cs202-planner",
      name: "Course Planner & Syllabus 2026.pdf",
      category: "Course Planner",
      totalPages: 4,
      uploadedAt: "1 month ago",
      size: "450 KB",
    },
  ],
  CS210: [
    {
      id: "cs210-lec6",
      name: "Lecture 6 - Graph Algorithms & Flow.pdf",
      category: "Lecture Decks",
      totalPages: 28,
      uploadedAt: "4 days ago",
      size: "3.1 MB",
    },
    {
      id: "cs210-lab2",
      name: "Lab 2 - Red-Black Trees Implementation.pdf",
      category: "Lab Handouts",
      totalPages: 5,
      uploadedAt: "1 week ago",
      size: "640 KB",
    },
    {
      id: "cs210-pyq",
      name: "Past Year Final Exam 2024.pdf",
      category: "Tutorials & PYQs",
      totalPages: 16,
      uploadedAt: "3 weeks ago",
      size: "4.5 MB",
    },
  ],
  MA201: [
    {
      id: "ma201-lec3",
      name: "Lecture 3 - Singular Value Decomposition.pdf",
      category: "Lecture Decks",
      totalPages: 20,
      uploadedAt: "6 days ago",
      size: "2.1 MB",
    },
    {
      id: "ma201-tut2",
      name: "Tutorial 2 - Eigenvalues & Diagonalization.pdf",
      category: "Tutorials & PYQs",
      totalPages: 7,
      uploadedAt: "2 weeks ago",
      size: "980 KB",
    },
  ],
  CS101: [
    {
      id: "cs101-lec2",
      name: "Lecture 2 - Memory Hierarchy & Cache.pdf",
      category: "Lecture Decks",
      totalPages: 18,
      uploadedAt: "1 month ago",
      size: "1.5 MB",
    },
  ],
};

const CATEGORIES = ["Course Planner", "Lecture Decks", "Lab Handouts", "Tutorials & PYQs"];

export function DashboardPage({ platform = "web" }: DashboardPageProps) {
  const { user, logout } = useAuth();

  // Workspace Zustand store
  const activeCourseId = useWorkspace((s) => s.activeCourseId) || "CS202";
  const switchCourse = useWorkspace((s) => s.switchCourse);
  const tabs = useWorkspace(selectTabs);
  const activeCourseWorkspace = useWorkspace(selectActiveCourse);
  const activeFileId = activeCourseWorkspace?.activeFileId ?? (tabs[0]?.fileId || null);
  const openTab = useWorkspace((s) => s.openTab);
  const closeTab = useWorkspace((s) => s.closeTab);
  const setActiveFile = useWorkspace((s) => s.setActiveFile);
  const openCitation = useWorkspace((s) => s.openCitation);

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
  } = useChatSession(activeCourseId);

  // Local UI states
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePage, setActivePage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize course if not selected
  useEffect(() => {
    if (!useWorkspace.getState().activeCourseId) {
      switchCourse("CS202");
    }
  }, [switchCourse]);

  // Current course metadata & files
  const currentCourse = useMemo(() => {
    return (
      MOCK_COURSES.find((c) => c.code === activeCourseId) ?? {
        code: activeCourseId,
        name: `${activeCourseId} Course Workspace`,
        year: 2,
        semester: 2,
        description: "Course syllabus and study materials.",
      }
    );
  }, [activeCourseId]);

  const courseFiles = useMemo(() => {
    return MOCK_FILES_BY_COURSE[activeCourseId] || [];
  }, [activeCourseId]);

  // Filtered files in explorer
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return courseFiles;
    const q = searchQuery.toLowerCase();
    return courseFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.category && f.category.toLowerCase().includes(q))
    );
  }, [courseFiles, searchQuery]);

  // Active opened document
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.fileId === activeFileId) || null;
  }, [tabs, activeFileId]);

  const activeDocument = useMemo(() => {
    if (!activeFileId) return null;
    return courseFiles.find((f) => f.id === activeFileId) || null;
  }, [courseFiles, activeFileId]);

  // When active tab changes or citation clicked, sync page
  useEffect(() => {
    if (activeTab?.page) {
      setActivePage(activeTab.page);
    }
  }, [activeTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenFile = (file: MockDocumentFile) => {
    openTab(activeCourseId, {
      fileId: file.id,
      filename: file.name,
      page: 1,
    });
    setActivePage(1);
    setSelectedCitation(null);
  };

  const handleCitationClick = (cite: CitationItem) => {
    setSelectedCitation(cite);
    const targetFile = courseFiles.find((f) => f.id === cite.f) || {
      id: cite.f,
      name: cite.l.split(" · ")[0] || "Referenced Document.pdf",
    };

    openCitation(activeCourseId, cite.f, targetFile.name, cite.p);
    if (cite.p) {
      setActivePage(cite.p);
    }
  };

  const handleSendMessage = async (text: string) => {
    try {
      const res = await sendMessage(text);
      if (res && res.answer) {
        return {
          text: res.answer,
          cites: res.citations?.map((c) => ({
            f: c.file_id,
            p: c.page ?? 1,
            l: c.filename ? `${c.filename} · p.${c.page ?? 1}` : `Document · p.${c.page ?? 1}`,
            quote: c.quote,
          })),
        };
      }
    } catch {
      // Fallback is handled inside Chat component when undefined is returned
    }
  };

  const handleOpenDocumentFromChat = (fileId: string, page: number) => {
    const targetFile = courseFiles.find((f) => f.id === fileId);
    openTab(activeCourseId, {
      fileId,
      filename: targetFile?.name || fileId,
      page,
    });
    setActivePage(page);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-(--bg-canvas,#161F29) text-(--tx,#DCE3EA) font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-(--bg-raise,#1C2833) border border-(--acc,#52A8EA) px-4 py-2 text-xs text-(--tx,#DCE3EA) shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-(--acc,#52A8EA)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-col flex-1 h-full min-w-0">
        {/* Top Navbar (F1) */}
        <header className="flex h-12 items-center justify-between border-b border-(--line,#25313E) bg-(--bg-bar,#101821) px-4 flex-none z-10">
          <div className="flex items-center gap-3">
            <img
              src="/ntbc-logo.png"
              alt="NotToBeCooked Logo"
              className="w-6 h-6 object-contain rounded"
            />
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-primary">NotToBeCooked</span>
              <span className="rounded bg-(--bg-raise,#1C2833) px-2 py-0.5 text-[10px] font-mono text-(--tx-dim,#8B98A7) border border-(--line,#25313E) uppercase">
                {platform}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-(--line,#25313E) text-xs text-(--tx-dim,#8B98A7)">
              <span className="font-medium text-(--tx,#DCE3EA)">{currentCourse.code}</span>
              <span>·</span>
              <span className="text-(--tx-faint,#5C6976)">{currentCourse.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {user && (
              <span className="text-(--tx-dim,#8B98A7) hidden sm:inline">
                Logged in as <strong className="text-(--tx,#DCE3EA)">{user.email}</strong>
              </span>
            )}
            <button
              onClick={() => logout()}
              className="rounded bg-(--bg-raise,#1C2833) border border-(--line,#25313E) px-3 py-1 text-xs text-(--tx-dim,#8B98A7) hover:text-white hover:border-destructive transition-colors cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Main 3-Pane Split View */}
        <div className="flex flex-1 min-h-0 min-w-0">
          {/* Left Pane: Explorer & Course Materials (F4) */}
          <aside className="w-64 flex-none border-r border-(--line,#25313E) bg-(--bg-panel,#121A23) flex flex-col min-h-0">
            {/* Scope / Course Switcher */}
            <div className="p-3 border-b border-(--line-soft,#1B2530) flex flex-col gap-2">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-(--tx-faint,#5C6976)">
                <span>Courses</span>
                <span>{MOCK_COURSES.length} Enrolled</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {MOCK_COURSES.map((c) => {
                  const isSelected = activeCourseId === c.code;
                  return (
                    <button
                      key={c.code}
                      onClick={() => switchCourse(c.code)}
                      className={`flex flex-col p-2 rounded-lg text-left transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-(--bg-raise,#1C2833) text-(--acc,#52A8EA) border-(--acc,#52A8EA)/30 shadow-sm"
                          : "bg-transparent text-(--tx-dim,#8B98A7) border-(--line-soft,#1B2530) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                      }`}
                    >
                      <span className="font-bold text-xs">{c.code}</span>
                      <span className="text-[10px] truncate text-(--tx-faint,#5C6976)">
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Document Filter & Upload (Stub) */}
            <div className="p-3 pb-2 flex flex-col gap-2 border-b border-(--line-soft,#1B2530)">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-(--tx-faint,#5C6976)">
                  Materials ({courseFiles.length})
                </span>
                <button
                  type="button"
                  onClick={() => showToast("File upload stub: Document ingestion simulated.")}
                  className="text-[11px] text-(--acc,#52A8EA) hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>+ Upload</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-(--bg-raise,#1C2833) border border-(--line,#25313E) rounded px-2 py-1 text-xs">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-(--tx-faint,#5C6976)">
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
                  className="w-full bg-transparent outline-none text-xs text-(--tx,#DCE3EA) placeholder:text-(--tx-faint,#5C6976)"
                />
              </div>
            </div>

            {/* Categorized File Tree */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-3 min-h-0 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent]">
              {CATEGORIES.map((cat) => {
                const filesInCat = filteredFiles.filter((f) => f.category === cat);
                if (filesInCat.length === 0) return null;

                return (
                  <div key={cat} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-(--tx-faint,#5C6976) uppercase tracking-wider">
                      <span>{cat}</span>
                      <span>{filesInCat.length}</span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {filesInCat.map((file) => {
                        const isOpen = tabs.some((t) => t.fileId === file.id);
                        const isActive = activeFileId === file.id;

                        return (
                          <button
                            key={file.id}
                            onClick={() => handleOpenFile(file)}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer group text-xs ${
                              isActive
                                ? "bg-(--bg-raise,#1C2833) text-(--acc,#52A8EA) font-medium border border-(--acc,#52A8EA)/20"
                                : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                            }`}
                          >
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0 text-(--tx-faint,#5C6976) group-hover:text-(--acc,#52A8EA)">
                              <path
                                d="M4 2h5.5L13 5.5V14H4V2z"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="truncate flex-1">{file.name}</span>
                            {isOpen && (
                              <span className="w-1.5 h-1.5 rounded-full bg-(--acc,#52A8EA) shrink-0" title="Open in Tab" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Center Workspace: Tabs & Document Viewer (F2) */}
          <main className="flex-1 flex flex-col min-w-0 bg-(--bg-canvas,#161F29) relative overflow-hidden">
            {/* Tabs Bar */}
            {tabs.length > 0 && (
              <div className="flex h-9 items-center border-b border-(--line,#25313E) bg-(--bg-bar,#101821) px-2 gap-1 overflow-x-auto flex-none scrollbar-none">
                {tabs.map((tab) => {
                  const isActive = tab.fileId === activeFileId;
                  return (
                    <div
                      key={tab.fileId}
                      onClick={() => setActiveFile(activeCourseId, tab.fileId)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-xs cursor-pointer border-t-2 transition-colors max-w-50 ${
                        isActive
                          ? "bg-(--bg-canvas,#161F29) text-(--tx,#DCE3EA) border-(--acc,#52A8EA) font-medium"
                          : "bg-transparent text-(--tx-dim,#8B98A7) border-transparent hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0 text-(--tx-faint,#5C6976)">
                        <path d="M4 2h5.5L13 5.5V14H4V2z" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                      <span className="truncate">{tab.filename}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(activeCourseId, tab.fileId);
                        }}
                        className="p-0.5 text-(--tx-faint,#5C6976) hover:text-white hover:bg-(--line,#25313E) rounded"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Document Viewer or Workspace Overview */}
            {activeDocument ? (
              /* ACTIVE DOCUMENT VIEWER (Stub/Mock Component) */
              <div className="flex flex-col flex-1 min-h-0 bg-(--bg-canvas,#161F29)">
                {/* Document Viewer Control Bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-(--line-soft,#1B2530) bg-(--bg-panel,#121A23)/40 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-(--tx,#DCE3EA)">{activeDocument.name}</span>
                    <span className="font-mono text-[10px] text-(--tx-faint,#5C6976) bg-(--bg-raise,#1C2833) px-2 py-0.5 rounded">
                      {activeDocument.size} · {activeDocument.totalPages} pages
                    </span>
                  </div>

                  {/* Viewer Controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-(--bg-raise,#1C2833) border border-(--line,#25313E) rounded px-2 py-0.5">
                      <button
                        type="button"
                        disabled={activePage <= 1}
                        onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                        className="text-(--tx-dim,#8B98A7) hover:text-white disabled:opacity-40 cursor-pointer"
                      >
                        ◀
                      </button>
                      <span className="font-mono text-[11px] px-1">
                        Page {activePage} of {activeDocument.totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={activePage >= activeDocument.totalPages}
                        onClick={() => setActivePage((p) => Math.min(activeDocument.totalPages, p + 1))}
                        className="text-(--tx-dim,#8B98A7) hover:text-white disabled:opacity-40 cursor-pointer"
                      >
                        ▶
                      </button>
                    </div>

                    <div className="flex items-center gap-1 bg-(--bg-raise,#1C2833) border border-(--line,#25313E) rounded px-2 py-0.5">
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                        className="text-(--tx-dim,#8B98A7) hover:text-white cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono text-[11px] px-1">{zoomLevel}%</span>
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                        className="text-(--tx-dim,#8B98A7) hover:text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Document Canvas Content Area */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center min-h-0 bg-(--bg-canvas,#161F29)">
                  {/* Citation Highlight Banner if active */}
                  {selectedCitation && (
                    <div className="w-full max-w-2xl mb-4 p-3 rounded-lg border border-(--cite-line,rgba(227,166,63,0.38)) bg-(--cite-bg,rgba(227,166,63,0.09)) text-xs text-(--cite,#E3A63F) flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-(--cite,#E3A63F)" />
                        <span>
                          <strong>Citation Evidence:</strong> {selectedCitation.l} (Page {selectedCitation.p})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCitation(null)}
                        className="text-xs hover:text-white cursor-pointer"
                      >
                        Dismiss ✕
                      </button>
                    </div>
                  )}

                  {/* Simulated Document Page Sheet */}
                  <div
                    style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
                    className="w-full max-w-2xl min-h-125 bg-(--bg-panel,#121A23) border border-(--line,#25313E) rounded-lg shadow-xl p-8 flex flex-col gap-4 text-xs leading-relaxed text-(--tx,#DCE3EA) transition-transform duration-150"
                  >
                    <div className="flex items-center justify-between border-b border-(--line-soft,#1B2530) pb-3 text-(--tx-faint,#5C6976) font-mono text-[10px]">
                      <span>{activeDocument.name}</span>
                      <span>Page {activePage} / {activeDocument.totalPages}</span>
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
                            <div className="p-3 rounded border border-(--cite-line,rgba(227,166,63,0.4)) bg-(--cite-bg,rgba(227,166,63,0.12)) text-(--tx-strong,#EDF2F6) shadow-sm">
                              <span className="font-mono text-[10px] uppercase font-semibold text-(--cite,#E3A63F) block mb-1">
                                Verified Grounded Quote
                              </span>
                              <em>"{selectedCitation.quote}"</em>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <h4 className="text-sm font-semibold text-(--acc,#52A8EA)">
                            Section {activePage}.1 — Core Theoretical Foundations
                          </h4>
                          <p className="text-(--tx-dim,#8B98A7)">
                            This document contains comprehensive materials for {currentCourse.code} ({currentCourse.name}).
                            All paragraphs and equations in this section are indexed by the Retrieval-Augmented Generation (RAG) pipeline for verified citation and context retrieval.
                          </p>
                          <div className="p-3 bg-(--bg-raise,#1C2833) rounded border border-(--line-soft,#1B2530) font-mono text-[11px] text-(--tx-faint,#5C6976)">
                            [Indexed Chunk #{activeCourseId}-{activeDocument.id}-p{activePage}]
                            <br />
                            Embedding vectors synced with vector store and ready for query matching.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* EMPTY / COURSE OVERVIEW HERO SCREEN */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto overflow-y-auto">
                <div className="max-w-md flex flex-col items-center gap-4">
                  <img
                    src="/ntbc-logo.png"
                    alt="NotToBeCooked Logo"
                    className="w-16 h-16 object-contain"
                  />
                  <div>
                    <h2 className="text-lg font-bold text-(--tx,#DCE3EA)">
                      {currentCourse.code} — {currentCourse.name}
                    </h2>
                    <p className="mt-1 text-xs text-(--tx-dim,#8B98A7) leading-relaxed">
                      {currentCourse.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (courseFiles.length > 0 && courseFiles[0]) {
                          handleOpenFile(courseFiles[0]);
                        }
                      }}
                      className="p-3 rounded-lg bg-(--bg-raise,#1C2833) border border-(--line,#25313E) hover:border-(--acc,#52A8EA) text-left transition-colors cursor-pointer group"
                    >
                      <span className="text-xs font-semibold text-(--tx,#DCE3EA) group-hover:text-(--acc,#52A8EA) block">
                        Open Recent Lecture
                      </span>
                      <span className="text-[10px] text-(--tx-faint,#5C6976) mt-0.5 block truncate">
                        {courseFiles[0]?.name || "Select document"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => showToast("Simulated document ingestion triggered.")}
                      className="p-3 rounded-lg bg-(--bg-raise,#1C2833) border border-(--line,#25313E) hover:border-(--acc,#52A8EA) text-left transition-colors cursor-pointer group"
                    >
                      <span className="text-xs font-semibold text-(--tx,#DCE3EA) group-hover:text-(--acc,#52A8EA) block">
                        Add Course Material
                      </span>
                      <span className="text-[10px] text-(--tx-faint,#5C6976) mt-0.5 block">
                        Upload PDF notes or lab
                      </span>
                    </button>
                  </div>

                  <p className="text-[11px] text-(--tx-faint,#5C6976)">
                    Select a document on the left or ask the AI Assistant on the right with grounded citations.
                  </p>
                </div>
              </div>
            )}
          </main>

          {/* Right Pane: AI Chat Assistant (F3) */}
          <Chat
            courseCode={activeCourseId}
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
  );
}

export default DashboardPage;
