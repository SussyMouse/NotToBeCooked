import React, { useState, useRef, useEffect } from "react";

export interface CitationItem {
  f: string; // file id
  p: number; // page
  b?: string; // block id
  l: string; // display label e.g. "Tutorial 1 · p.1"
}

export interface ChatMessage {
  id?: string;
  r: "ai" | "me"; // role
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
  // Matches confirmed atomic mentions @[Filename or Category] OR standard @word
  const parts = text.split(/(@\[[^\]]+\]|@[^\s]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@[") && part.endsWith("]")) {
      const label = part.slice(2, -1);
      const isPdf = label.toLowerCase().endsWith(".pdf") || label.toLowerCase().includes("doc") || label.toLowerCase().includes("pdf");
      return (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-(--acc,#52A8EA) font-medium mx-0.5 select-none"
        >
          {isPdf ? (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0 text-(--acc,#52A8EA) inline-block align-sub">
              <path d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-6.5L9.5 2h-6z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0 text-(--acc,#52A8EA) inline-block align-sub">
              <path d="M2 4a1 1 0 011-1h3.5L8 4.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span>{label}</span>
        </span>
      );
    } else if (part.startsWith("@")) {
      const label = part.slice(1);
      return (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-(--acc,#52A8EA) font-medium mx-0.5 select-none"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0 text-(--acc,#52A8EA) inline-block align-sub">
            <path d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-6.5L9.5 2h-6z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{label}</span>
        </span>
      );
    }
    return part;
  });
}

function createMentionBadgeElement(name: string): HTMLElement {
  const isPdf = name.toLowerCase().endsWith(".pdf") || name.toLowerCase().includes("doc") || name.toLowerCase().includes("pdf");

  const span = document.createElement("span");
  span.contentEditable = "false";
  span.dataset.mention = `@[${name}]`;
  span.className =
    "inline-flex items-center gap-1 text-(--acc,#52A8EA) font-medium mx-0.5 select-none cursor-default";

  const iconSvg = isPdf
    ? `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" class="shrink-0 text-(--acc,#52A8EA) inline-block align-sub"><path d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-6.5L9.5 2h-6z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 2v4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" class="shrink-0 text-(--acc,#52A8EA) inline-block align-sub"><path d="M2 4a1 1 0 011-1h3.5L8 4.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  span.innerHTML = `${iconSvg}<span>${escapeHtml(name)}</span>`;
  return span;
}

function getQueryFromEditor(editor: HTMLDivElement | null): string {
  if (!editor) return "";
  let result = "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.nodeValue || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.dataset.mention) {
        result += el.dataset.mention;
      } else if (el.tagName === "BR") {
        result += "\n";
      } else {
        for (let i = 0; i < el.childNodes.length; i++) {
          walk(el.childNodes[i]);
        }
      }
    }
  };

  for (let i = 0; i < editor.childNodes.length; i++) {
    walk(editor.childNodes[i]);
  }
  return result;
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

  // Input & Composer state
  const [isEmpty, setIsEmpty] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [atOpen, setAtOpen] = useState(false);
  const [atFilter, setAtFilter] = useState("");

  const msgsEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

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

  const handleEditorInput = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const query = getQueryFromEditor(editor);
    setIsEmpty(query.trim() === "");

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      const textBeforeCursor = (node.nodeValue || "").slice(0, range.startOffset);
      const match = textBeforeCursor.match(/@([^\s@]*)$/);
      if (match) {
        setAtOpen(true);
        setAtFilter(match[1] || "");
        return;
      }
    }
    setAtOpen(false);
    setAtFilter("");
  };

  // Confirm a mention from dropdown -> Inserts inline [PDF/Folder Icon] badge right at cursor position!
  const insertMention = (name: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue || "";
      const offset = range.startOffset;
      const textBefore = text.slice(0, offset);
      const textAfter = text.slice(offset);

      const match = textBefore.match(/@([^\s@]*)$/);
      if (match) {
        const atIndex = match.index!;
        const cleanBefore = textBefore.slice(0, atIndex);

        node.nodeValue = cleanBefore;

        const badge = createMentionBadgeElement(name);
        const spaceNode = document.createTextNode("\u00A0");

        const parent = node.parentNode!;
        const next = node.nextSibling;

        parent.insertBefore(badge, next);
        parent.insertBefore(spaceNode, badge.nextSibling);

        if (textAfter) {
          const afterNode = document.createTextNode(textAfter);
          parent.insertBefore(afterNode, spaceNode.nextSibling);
        }

        // Move cursor right after non-breaking space
        const newRange = document.createRange();
        newRange.setStartAfter(spaceNode);
        newRange.setEndAfter(spaceNode);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }

    setAtOpen(false);
    setAtFilter("");
    setIsEmpty(false);
    editor.focus();
  };

  // Handle key navigation and Enter to Send (Shift+Enter for newline)
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (atOpen) {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const firstMatch = filteredCategories[0] || filteredFiles[0]?.name;
        if (firstMatch) {
          insertMention(firstMatch);
          return;
        }
      }
      if (e.key === "Escape") {
        setAtOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && !isTyping) {
      e.preventDefault();
      handleSend();
      return;
    }
  };

  const handleSend = async (textToSend?: string) => {
    if (isTyping) return;

    let fullQuery = "";
    if (textToSend !== undefined) {
      fullQuery = textToSend.trim();
    } else {
      fullQuery = getQueryFromEditor(editorRef.current).trim();
    }

    if (!fullQuery) return;

    const userMsg: ChatMessage = { r: "me", x: fullQuery };
    updateCurrentCourseMessages((prev) => [...prev, userMsg]);

    if (textToSend === undefined && editorRef.current) {
      editorRef.current.innerHTML = "";
      setIsEmpty(true);
    }
    setAtOpen(false);
    setIsTyping(true);

    try {
      if (onSendMessage) {
        const res = await onSendMessage(fullQuery);
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

          const qLower = fullQuery.toLowerCase();
          if (qLower.includes("condense") || qLower.includes("summary")) {
            responseText = `Here is a condensed overview for <b>${escapeHtml(courseCode)}</b>: key core topics include data structures, asymptotic bounds, sorting, and relational algebra.`;
            responseCites = [{ f: `${courseCode.toLowerCase()}-planner`, p: 1, l: "Course Planner · p.1" }];
          } else if (qLower.includes("quiz") || qLower.includes("test")) {
            responseText = "<b>Quiz Question:</b> What is the worst-case time complexity of QuickSort when using a naive pivot on an already sorted array?";
            responseCites = [{ f: `${courseCode.toLowerCase()}-lec4`, p: 1, b: "ev-quick", l: "Lecture 4 · p.1" }];
          } else if (qLower.includes("simplify") || qLower.includes("explain")) {
            responseText = "In simple terms: <b>O(N log N)</b> scales much better than <b>O(N²)</b> as data grows large. At 10,000 items, O(N log N) finishes instantly while O(N²) takes thousands of times longer.";
            responseCites = [{ f: `${courseCode.toLowerCase()}-tut1`, p: 1, b: "ev-bigo", l: "Tutorial 1 · p.1" }];
          } else if (qLower.includes("storyboard") || qLower.includes("roadmap")) {
            responseText = "<b>Course Roadmap:</b><br/>1. Big-O Complexity<br/>2. Sorting & Pivot Selection<br/>3. Relational Algebra & Database Queries";
            responseCites = [{ f: `${courseCode.toLowerCase()}-planner`, p: 1, l: "Course Planner · p.1" }];
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
    setCourseMessagesMap((prev) => ({
      ...prev,
      [courseCode]: [],
    }));
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setIsEmpty(true);
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
        <div className="flex-1 overflow-y-auto p-2.5 flex flex-col min-h-0 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-(--line,#25313E) [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {currentMessages.length === 0 ? (
            /* DEFAULT WELCOME SCREEN (When no conversation started yet) */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-3 my-auto gap-3 animate-in fade-in duration-300">
              {/* AI Logo Badge */}
              <img
                src="/ntbc-logo.png"
                alt="NotToBeCooked Logo"
                className="w-12 h-12 object-contain"
              />

              {/* Big Welcoming Title & Subtitle */}
              <div className="flex flex-col gap-1 max-w-xs">
                <h3 className="text-base font-semibold tracking-tight text-(--tx,#DCE3EA)">
                  Synced with <span className="text-(--acc,#52A8EA) font-mono">{filesCount} files</span> in {courseCode}
                </h3>
                <p className="text-[12px] text-(--tx-dim,#8B98A7) leading-relaxed">
                  Ask questions across your notes, PYQs, and labs — every answer comes with exact document citations.
                </p>
              </div>

              {/* Suggested Questions */}
              {quickPrompts.length > 0 && (
                <div className="flex flex-col gap-1.5 w-full max-w-xs mt-1">
                  <span className="font-mono text-[9.5px] text-(--tx-faint,#5C6976) tracking-wider uppercase">
                    Suggested Questions
                  </span>
                  <div className="flex flex-col gap-1">
                    {quickPrompts.map((q, idx) => (
                      <button
                        key={idx}
                        disabled={isTyping}
                        onClick={() => handleSend(q)}
                        className="text-left bg-(--bg-raise,#1C2833) border border-(--line,#25313E) hover:border-(--acc-deep,#1D5D8A) text-(--tx-dim,#8B98A7) hover:text-(--tx,#DCE3EA) rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 [outline:none]"
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
            <div className="flex flex-col gap-2.5">
              {currentMessages.map((m, idx) => {
                const isMe = m.r === "me";
                return (
                  <div
                    key={idx}
                    className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start w-full"}`}
                  >
                    {/* User Chatbox Bubble / AI Full-width Text */}
                    <div
                      className={`text-[14px] leading-relaxed text-justify ${
                        isMe
                          ? "bg-[rgba(var(--acc-rgb,82,168,234),0.12)] border border-[rgba(var(--acc-rgb,82,168,234),0.25)] text-(--acc-tx-soft,#A8D4F2) rounded-lg rounded-tr-xs px-2.5 py-1.5 max-w-[85%]"
                          : "text-(--tx,#DCE3EA) w-full py-0.5"
                      }`}
                    >
                      {isMe ? (
                        renderMentionized(m.x)
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: m.x }} />
                      )}

                      {/* Citations */}
                      {m.cites && m.cites.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {m.cites.map((cite, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => onCiteClick && onCiteClick(cite)}
                              className="inline-flex items-center gap-1 bg-(--cite-bg,rgba(227,166,63,0.09)) border border-(--cite-line,rgba(227,166,63,0.38)) text-(--cite,#E3A63F) rounded px-1.5 py-0.5 text-[10.5px] font-mono hover:bg-[rgba(227,166,63,0.19)] transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 [outline:none]"
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
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="w-full flex items-center py-0.5">
                  <div className="flex gap-1 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-(--acc,#52A8EA) animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-(--acc,#52A8EA) animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-(--acc,#52A8EA) animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={msgsEndRef} />
        </div>

        {/* Quick Suggestions at bottom (only visible when conversation is active) */}
        {currentMessages.length > 0 && quickPrompts.length > 0 && (
          <div className="flex-none flex flex-wrap gap-1 px-2.5 pb-1.5 items-center">
            <span className="font-mono text-[9.5px] text-(--tx-faint,#5C6976) tracking-wider uppercase mr-1">
              Try
            </span>
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                disabled={isTyping}
                onClick={() => handleSend(q)}
                className="bg-(--bg-raise,#1C2833) border border-(--line,#25313E) text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA) rounded-full px-2.5 py-0.5 text-[11px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 [outline:none]"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Composer Container */}
        <div className="flex-none p-2 pt-0 relative">
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

          {/* Inline Rich Composer with continuous text flow and PDF/Folder Icon Badges */}
          <div className="flex items-end gap-2 bg-(--bg-raise,#1C2833) border border-(--line,#25313E) focus-within:border-(--acc-deep,#1D5D8A) rounded-lg p-2 transition-colors relative">
            <div className="flex-1 min-w-0 relative">
              {isEmpty && (
                <div className="absolute top-0.5 left-0 text-[14px] text-(--tx-faint,#5C6976) pointer-events-none select-none">
                  {isTyping ? "Assistant is typing…" : "Ask a question or type @ to scope files..."}
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable={!isTyping}
                onInput={handleEditorInput}
                onKeyDown={handleEditorKeyDown}
                onKeyUp={handleEditorInput}
                className="outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 [outline:none] text-(--tx,#DCE3EA) text-[14px] min-h-6 max-h-40 overflow-y-auto leading-relaxed py-0.5 whitespace-pre-wrap wrap-break-word scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent]"
              />
            </div>

            <button
              onClick={() => handleSend()}
              disabled={isTyping || isEmpty}
              title="Send"
              className="w-6 h-6 rounded flex items-center justify-center bg-(--acc-deep,#1D5D8A) hover:bg-(--acc-deep-h,#246C9E) text-(--on-acc,#EAF5FD) transition-colors flex-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-(--acc-deep,#1D5D8A) mb-0.5"
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
        </div>
      </aside>
    </div>
  );
};

export default Chat;