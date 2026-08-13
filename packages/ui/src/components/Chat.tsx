import React, { useState, useRef, useEffect } from "react";

export interface CitationItem {
  f: string; // file id
  p: number; // page
  b?: string; // block id
  l: string; // display label e.g. "Tutorial 1 · p.1"
}

export interface ChatMessage {
  id?: string;
  r: "ai" | "me";
  x: string; // message text
  cites?: CitationItem[];
}

export interface ChatFile {
  id: string;
  name: string;
  category?: string;
}

export interface ChatProps {
  courseCode?: string;
  filesCount?: number;
  files?: ChatFile[];
  categories?: string[];
  quickPrompts?: string[];
  initialMessages?: ChatMessage[];
  onSendMessage?: (text: string) => Promise<{ text: string; cites?: CitationItem[] } | void> | { text: string; cites?: CitationItem[] } | void;
  onCiteClick?: (cite: CitationItem) => void;
  onClearChat?: () => void;
  className?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMentionized(text: string): React.ReactNode {
  const parts = text.split(/(@[^\s]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span
          key={i}
          className="inline-flex items-center gap-1 bg-[rgba(var(--acc-rgb,82,168,234),0.16)] border border-[rgba(var(--acc-rgb,82,168,234),0.3)] text-(--acc-tx-soft,#A8D4F2) rounded px-1.5 py-0.5 text-[11.5px] font-mono whitespace-nowrap"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export const Chat: React.FC<ChatProps> = ({
  courseCode = "CS202",
  filesCount = 9,
  files = [
    { id: "cs202-lec4", name: "Lecture 4.pdf", category: "Lecture Decks" },
    { id: "cs202-lab3", name: "Lab 3.pdf", category: "Lab Handouts" },
    { id: "cs202-tut1", name: "Tutorial 1.pdf", category: "Tutorials & PYQs" },
    { id: "cs202-planner", name: "Course Planner.pdf", category: "Course Planner" },
  ],
  categories = ["Course Planner", "Lecture Decks", "Lab Handouts", "Tutorials & PYQs"],
  quickPrompts = [
    "Condense",
    "Quiz me",
    "Simplify",
    "Storyboard",
  ],
  initialMessages,
  onSendMessage,
  onCiteClick,
  onClearChat,
  className = "",
}) => {
  // Horizontal Resizing State
  const [width, setWidth] = useState<number>(338);
  const [isResizing, setIsResizing] = useState(false);

  // Per-course conversation history map. Default is empty array [] so the Hero Welcome Screen shows!
  const [courseMessagesMap, setCourseMessagesMap] = useState<Record<string, ChatMessage[]>>({});

  // Input & UI state
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [atOpen, setAtOpen] = useState(false);
  const [atFilter, setAtFilter] = useState("");

  const msgsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get active messages for current course (defaults to initialMessages or empty [])
  const currentMessages = courseMessagesMap[courseCode] ?? initialMessages ?? [];

  const updateCurrentCourseMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setCourseMessagesMap((prev) => {
      const existing = prev[courseCode] ?? initialMessages ?? [];
      return {
        ...prev,
        [courseCode]: updater(existing),
      };
    });
  };

  // Horizontal Drag Resizing effect
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 280 && newWidth <= 800) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const scrollToBottom = () => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, isTyping, courseCode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputVal(v);

    const match = v.match(/@([^\s]*)$/);
    if (match) {
      setAtOpen(true);
      setAtFilter(match[1] || "");
    } else {
      setAtOpen(false);
      setAtFilter("");
    }
  };

  const insertMention = (name: string) => {
    const newText = inputVal.replace(/@([^\s]*)$/, `@${name} `);
    setInputVal(newText);
    setAtOpen(false);
    inputRef.current?.focus();
  };

  const handleSend = async (textToSend?: string) => {
    if (isTyping) return;

    const query = (textToSend !== undefined ? textToSend : inputVal).trim();
    if (!query) return;

    const userMsg: ChatMessage = { r: "me", x: query };
    updateCurrentCourseMessages((prev) => [...prev, userMsg]);

    if (textToSend === undefined) {
      setInputVal("");
    }
    setAtOpen(false);
    setIsTyping(true);

    try {
      if (onSendMessage) {
        const res = await onSendMessage(query);
        setIsTyping(false);
        if (res && res.text) {
          updateCurrentCourseMessages((prev) => [
            ...prev,
            { r: "ai", x: res.text, cites: res.cites },
          ]);
        }
      } else {
        // Fallback default answer mock
        setTimeout(() => {
          setIsTyping(false);
          let responseText = `I found <b>3 passages</b> in ${escapeHtml(
            courseCode
          )} related to that. The closest sits in <b>${escapeHtml(
            files[0]?.name || "Document"
          )}</b> — open the citation to read in context.`;
          let responseCites: CitationItem[] = [
            {
              f: files[0]?.id || "f1",
              p: 1,
              l: `${files[0]?.category || "Course Material"} · p.1`,
            },
          ];

          const qLower = query.toLowerCase();
          if (qLower.includes("grading") || qLower.includes("breakdown") || qLower.includes("mark")) {
            responseText = `The breakdown for ${escapeHtml(courseCode)} is <b>20% Midterm, 30% Labs, 50% Final Exam</b> as per the Course Planner.`;
            responseCites = [{ f: `${courseCode.toLowerCase()}-planner`, p: 1, l: "Course Planner · p.1" }];
          } else if (qLower.includes("big o") || qLower.includes("n log n") || qLower.includes("complex")) {
            responseText = "At N = 10,000 the log factor is about 13.3, so an O(N log N) algorithm does roughly <b>13× the work</b> of a single O(N) pass.";
            responseCites = [
              { f: `${courseCode.toLowerCase()}-tut1`, p: 1, b: "ev-bigo", l: "Tutorial 1 · p.1" },
              { f: `${courseCode.toLowerCase()}-lec4`, p: 1, b: "ev-quick", l: "Lecture 4 · p.1" },
            ];
          } else if (qLower.includes("lab 3") || qLower.includes("lecture 4")) {
            responseText = "Lab 3 asks you to <b>measure</b> what Lecture 4 asserts. The lecture states QuickSort averages O(N log N) and degrades to O(N²) on a bad pivot.";
            responseCites = [
              { f: `${courseCode.toLowerCase()}-lab3`, p: 1, b: "ev-lab3", l: "Lab 3 · p.1" },
              { f: `${courseCode.toLowerCase()}-lec4`, p: 1, b: "ev-quick", l: "Lecture 4 · p.1" },
            ];
          }

          updateCurrentCourseMessages((prev) => [
            ...prev,
            { r: "ai", x: responseText, cites: responseCites },
          ]);
        }, 620);
      }
    } catch {
      setIsTyping(false);
    }
  };

  const handleClear = () => {
    // Setting current course messages to empty [] brings back the Welcome Screen!
    setCourseMessagesMap((prev) => ({
      ...prev,
      [courseCode]: [],
    }));
    if (onClearChat) onClearChat();
  };

  // Filter mentions
  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(atFilter.toLowerCase())
  );
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(atFilter.toLowerCase())
  );

  return (
    <div className="flex h-full min-h-0 flex-none relative">
      {/* Horizontal Drag Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-1.5 cursor-col-resize hover:bg-(--acc,#52A8EA) transition-colors flex-none relative z-10 ${
          isResizing ? "bg-(--acc,#52A8EA)" : "bg-(--line,#25313E)"
        }`}
        title="Drag horizontally to resize Chat panel"
      />

      {/* Main Chat Panel */}
      <aside
        style={{ width: `${width}px` }}
        className={`flex flex-col min-h-0 bg-(--bg-panel,#121A23) text-(--tx,#DCE3EA) text-xs select-none ${className}`}
      >
        {/* Header */}
        <div className="flex-none h-8.5 flex items-center gap-2 px-3 border-b border-(--line-soft,#1B2530)">
          <span className="w-1.5 h-1.5 rounded-full bg-(--ok,#4FB07C) flex-none shadow-[0_0_0_3px_rgba(79,176,124,0.15)]" />
          <span className="text-[12.5px] font-semibold text-(--tx,#DCE3EA)">
            Assistant
          </span>
          <span className="ml-auto font-mono text-[10px] text-(--tx-faint,#5C6976)">
            {courseCode} · {filesCount} files
          </span>
          <button
            onClick={handleClear}
            title="Clear conversation for this course"
            className="p-1 text-(--tx-dim,#8B98A7) hover:text-(--tx,#DCE3EA) hover:bg-(--bg-hover,#213040) transition-colors rounded cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 4h8M5.6 4V2.8h2.8V4M4.2 4l.5 7.2h4.6L9.8 4"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col min-h-0 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-(--line,#25313E) [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {currentMessages.length === 0 ? (
            /* DEFAULT WELCOME SCREEN (When no conversation started yet) */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 my-auto gap-4 animate-in fade-in duration-300">
              {/* AI Logo Badge */}
              <img
                src="/ntbc-logo.png"
                alt="NotToBeCooked Logo"
                className="w-12 h-12 object-contain"
              />

              {/* Big Welcoming Title & Subtitle */}
              <div className="flex flex-col gap-1.5 max-w-xs">
                <h3 className="text-base font-semibold tracking-tight text-(--tx,#DCE3EA)">
                  Synced with <span className="text-(--acc,#52A8EA) font-mono">{filesCount} files</span> in {courseCode}
                </h3>
                <p className="text-[12px] text-(--tx-dim,#8B98A7) leading-relaxed">
                  Ask questions across your notes, PYQs, and labs — every answer comes with exact document citations.
                </p>
              </div>

              {/* Suggested Questions */}
              {quickPrompts.length > 0 && (
                <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                  <span className="font-mono text-[9.5px] text-(--tx-faint,#5C6976) tracking-wider uppercase">
                    Suggested Questions
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {quickPrompts.map((q, idx) => (
                      <button
                        key={idx}
                        disabled={isTyping}
                        onClick={() => handleSend(q)}
                        className="text-left bg-(--bg-raise,#1C2833) border border-(--line,#25313E) hover:border-(--acc-deep,#1D5D8A) text-(--tx-dim,#8B98A7) hover:text-(--tx,#DCE3EA) rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>{q}</span>
                        <span className="text-(--tx-faint,#5C6976) group-hover:text-(--acc,#52A8EA) transition-colors">↗</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CONVERSATION MESSAGES LIST (Once conversation starts) */
            <div className="flex flex-col gap-3.5">
              {currentMessages.map((m, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  {/* Sender */}
                  <div className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-wider uppercase text-(--tx-faint,#5C6976)">
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center flex-none font-bold font-mono text-[8px] ${
                        m.r === "ai"
                          ? "bg-linear-to-br from-(--acc,#52A8EA) to-(--acc-deep,#1D5D8A) text-(--on-acc-bright,#08131C)"
                          : "bg-(--bg-hover,#213040) text-(--tx-dim,#8B98A7)"
                      }`}
                    >
                      {m.r === "ai" ? "AI" : "ME"}
                    </span>
                    {m.r === "ai" ? "Assistant" : "You"}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`text-[12.8px] leading-relaxed rounded-lg p-2.5 ${
                      m.r === "ai"
                        ? "bg-(--bg-raise,#1C2833) border border-(--line-soft,#1B2530) text-(--tx-dim,#8B98A7)"
                        : "bg-[rgba(var(--acc-rgb,82,168,234),0.09)] border border-[rgba(var(--acc-rgb,82,168,234),0.2)] text-(--acc-tx-mute,#CBDDEB)"
                    }`}
                  >
                    {m.r === "me" ? (
                      renderMentionized(m.x)
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: m.x }} />
                    )}

                    {/* Citations */}
                    {m.cites && m.cites.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {m.cites.map((cite, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => onCiteClick && onCiteClick(cite)}
                            className="inline-flex items-center gap-1 bg-(--cite-bg,rgba(227,166,63,0.09)) border border-(--cite-line,rgba(227,166,63,0.38)) text-(--cite,#E3A63F) rounded px-1.5 py-0.5 text-[10.5px] font-mono hover:bg-[rgba(227,166,63,0.19)] transition-colors cursor-pointer"
                          >
                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                              <path
                                d="M2 5.2l2 2 4-4.4"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {cite.l}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-wider uppercase text-(--tx-faint,#5C6976)">
                    <span className="w-4 h-4 rounded flex items-center justify-center flex-none font-bold font-mono text-[8px] bg-linear-to-br from-(--acc,#52A8EA) to-(--acc-deep,#1D5D8A) text-(--on-acc-bright,#08131C)">
                      AI
                    </span>
                    Assistant
                  </div>
                  <div className="bg-(--bg-raise,#1C2833) border border-(--line-soft,#1B2530) rounded-lg p-2.5 w-fit">
                    <div className="flex gap-1 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-(--tx-faint,#5C6976) animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-(--tx-faint,#5C6976) animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-(--tx-faint,#5C6976) animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={msgsEndRef} />
        </div>

        {/* Quick Suggestions at bottom (only visible when conversation is active) */}
        {currentMessages.length > 0 && quickPrompts.length > 0 && (
          <div className="flex-none flex flex-wrap gap-1 px-3 pb-2 items-center">
            <span className="font-mono text-[9.5px] text-(--tx-faint,#5C6976) tracking-wider uppercase mr-1">
              Try
            </span>
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                disabled={isTyping}
                onClick={() => handleSend(q)}
                className="bg-(--bg-raise,#1C2833) border border-(--line,#25313E) text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA) rounded-full px-2.5 py-0.5 text-[11px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="flex-none p-3 pt-0 relative">
          {/* @ Mention Picker Dropdown */}
          {atOpen && (
            <div className="absolute bottom-[calc(100%-4px)] left-3 right-3 bg-(--bg-raise,#1C2833) border border-(--line,#25313E) rounded-lg shadow-lg overflow-hidden z-20">
              <div className="px-3 py-1.5 border-b border-(--line-soft,#1B2530) font-mono text-[9.5px] uppercase tracking-wider text-(--tx-faint,#5C6976)">
                Mention a file or category
              </div>
              <div className="max-h-48 overflow-y-auto p-1 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent]">
                {filteredCategories.map((cat, idx) => (
                  <div
                    key={`cat-${idx}`}
                    onClick={() => insertMention(cat)}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-(--bg-hover,#213040) cursor-pointer"
                  >
                    <span className="text-(--tx-faint,#5C6976)">📁</span>
                    <span className="text-xs text-(--tx,#DCE3EA) font-medium">
                      {cat}
                    </span>
                    <span className="ml-auto font-mono text-[9.5px] text-(--tx-faint,#5C6976)">
                      Category
                    </span>
                  </div>
                ))}
                {filteredFiles.map((file, idx) => (
                  <div
                    key={`file-${idx}`}
                    onClick={() => insertMention(file.name)}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-(--bg-hover,#213040) cursor-pointer"
                  >
                    <span className="text-(--tx-faint,#5C6976)">📄</span>
                    <span className="text-xs text-(--tx,#DCE3EA) truncate">
                      {file.name}
                    </span>
                    <span className="ml-auto font-mono text-[9.5px] text-(--tx-faint,#5C6976) shrink-0">
                      {file.category || "File"}
                    </span>
                  </div>
                ))}
                {filteredCategories.length === 0 && filteredFiles.length === 0 && (
                  <div className="p-2 text-center text-xs text-(--tx-faint,#5C6976)">
                    No matching files or categories
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div className="flex items-center gap-2 bg-(--bg-raise,#1C2833) border border-(--line,#25313E) focus-within:border-(--acc-deep,#1D5D8A) rounded-lg p-2 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              disabled={isTyping}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isTyping) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isTyping ? "Assistant is typing…" : `Ask across ${courseCode} notes, PYQs, labs…`}
              autoComplete="off"
              className="flex-1 bg-transparent border-0 outline-none text-(--tx,#DCE3EA) text-[12.5px] placeholder-(--tx-faint,#5C6976) min-w-0 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={isTyping || !inputVal.trim()}
              title="Send"
              className="w-6 h-6 rounded flex items-center justify-center bg-(--acc-deep,#1D5D8A) hover:bg-(--acc-deep-h,#246C9E) text-(--on-acc,#EAF5FD) transition-colors flex-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-(--acc-deep,#1D5D8A)"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1.8 7h9.4M7.4 3.2L11.2 7l-3.8 3.8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="text-[10.5px] text-(--tx-faint,#5C6976) mt-1.5 font-mono">
            Type{" "}
            <kbd className="bg-(--bg-raise,#1C2833) border border-(--line,#25313E) rounded px-1 text-(--tx-dim,#8B98A7)">
              @
            </kbd>{" "}
            to scope the question to a file
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Chat;