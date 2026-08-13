import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Chat, { CitationItem } from "../components/Chat";

export interface DashboardPageProps {
  platform?: "web" | "tauri";
}

export function DashboardPage({ platform = "web" }: DashboardPageProps) {
  const { user, logout } = useAuth();
  const [activeCourse, setActiveCourse] = useState("CS202");
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);

  const handleCiteClick = (cite: CitationItem) => {
    setSelectedCitation(cite);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-(--bg-canvas,#161F29) text-(--tx,#DCE3EA) font-sans">
      {/* Workspace container */}
      <div className="flex flex-col flex-1 h-full min-w-0">
        {/* Top Navbar */}
        <header className="flex h-12 items-center justify-between border-b border-(--line,#25313E) bg-(--bg-bar,#101821) px-4 flex-none">
          <div className="flex items-center gap-2.5">
            <img src="/ntbc-logo.png" alt="NotToBeCooked Logo" className="w-6 h-6 object-contain rounded" />
            <span className="font-bold text-sm tracking-wide text-primary">NotToBeCooked</span>
            <span className="rounded bg-(--bg-raise,#1C2833) px-2 py-0.5 text-[10px] font-mono text-(--tx-dim,#8B98A7) border border-(--line,#25313E) uppercase">
              {platform}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {user && (
              <span className="text-(--tx-dim,#8B98A7)">
                Logged in as <strong className="text-(--tx,#DCE3EA)">{user.email}</strong>
              </span>
            )}
            <button
              onClick={logout}
              className="rounded bg-(--bg-raise,#1C2833) border border-(--line,#25313E) px-3 py-1 text-xs text-(--tx-dim,#8B98A7) hover:text-white hover:border-destructive transition-colors cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Main Workspace Split View */}
        <div className="flex flex-1 min-h-0 min-w-0">
          {/* Explorer Sidebar */}
          <aside className="w-56 flex-none border-r border-(--line,#25313E) bg-(--bg-panel,#121A23) flex flex-col p-3 text-xs gap-3">
            <div className="flex items-center justify-between border-b border-(--line-soft,#1B2530) pb-2 font-mono text-[10px] uppercase tracking-wider text-(--tx-faint,#5C6976)">
              <span>Courses</span>
              <span>4 Active</span>
            </div>
            <nav className="flex flex-col gap-1">
              {[
                { code: "CS202", count: 9 },
                { code: "CS210", count: 6 },
                { code: "MA201", count: 4 },
                { code: "CS101", count: 2 },
              ].map(({ code, count }) => (
                <button
                  key={code}
                  onClick={() => setActiveCourse(code)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    activeCourse === code
                      ? "bg-(--bg-raise,#1C2833) text-(--acc,#52A8EA) font-semibold border border-[rgba(var(--acc-rgb,82,168,234),0.2)]"
                      : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                  }`}
                >
                  <span>{code}</span>
                  <span className="font-mono text-[10px] text-(--tx-faint,#5C6976)">
                    {count} files
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Document Viewer / Center Workspace */}
          <main className="flex-1 flex flex-col min-w-0 bg-(--bg-canvas,#161F29) p-6 overflow-y-auto">
            {selectedCitation ? (
              <div className="flex flex-col gap-3 rounded-lg border border-(--cite-line,rgba(227,166,63,0.38)) bg-(--cite-bg,rgba(227,166,63,0.09)) p-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-(--cite,#E3A63F) flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5.2l2 2 4-4.4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Citation Evidence: {selectedCitation.l}
                  </span>
                  <button
                    onClick={() => setSelectedCitation(null)}
                    className="text-xs text-(--tx-faint,#5C6976) hover:text-white transition-colors cursor-pointer"
                  >
                    Close ✕
                  </button>
                </div>
                <p className="text-xs text-(--tx-dim,#8B98A7) leading-relaxed">
                  Highlighting source document block for file <strong className="text-(--tx,#DCE3EA)">{selectedCitation.f}</strong> (Page {selectedCitation.p}). Grounding check confirmed verbatim quote.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center p-8 border border-dashed border-(--line,#25313E) rounded-xl my-auto gap-3">
                <img src="/ntbc-logo.png" alt="NotToBeCooked Logo" className="w-16 h-16 object-contain" />
                <div>
                  <h2 className="text-lg font-semibold text-(--tx,#DCE3EA)">
                    {activeCourse} Workspace
                  </h2>
                  <p className="mt-1 text-xs text-(--tx-faint,#5C6976) max-w-sm">
                    Select a document from the explorer on the left or use the Assistant on the right to search across notes, PYQs, and lab handouts with citations.
                  </p>
                </div>
              </div>
            )}
          </main>

          {/* Chat Panel */}
          <Chat
            courseCode={activeCourse}
            filesCount={activeCourse === "CS202" ? 9 : activeCourse === "CS210" ? 6 : activeCourse === "MA201" ? 4 : 2}
            onCiteClick={handleCiteClick}
            className="h-full flex-none"
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
