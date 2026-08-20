import React, { useState, useRef, useEffect, useMemo } from "react"
import {
  ChatMessageItem,
  type ChatMessage,
  type CitationItem,
} from "./ChatMessage"
import { ChatInput, type ChatFile } from "./ChatInput"
import { History, type ChatSessionItem } from "./History"
import { CitationDrawer } from "./CitationDrawer"

export type { CitationItem, ChatMessage, ChatFile, ChatSessionItem }

export interface ChatProps {
  courseCode?: string
  filesCount?: number
  files?: ChatFile[]
  categories?: string[]
  quickPrompts?: string[]

  // Controlled or uncontrolled message state
  messages?: ChatMessage[]
  initialMessages?: ChatMessage[]

  // Controlled session history state
  sessions?: ChatSessionItem[]
  activeSessionId?: string | null

  // Loading & State
  isTyping?: boolean

  // Callbacks
  onSendMessage?: (
    text: string
  ) =>
    | Promise<{ text: string; cites?: CitationItem[] } | void>
    | { text: string; cites?: CitationItem[] }
    | void
  onCiteClick?: (cite: CitationItem) => void
  onSelectSession?: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onNewChat?: () => void
  onClearChat?: () => void
  onOpenDocument?: (fileId: string, page: number) => void

  className?: string
}

export const Chat: React.FC<ChatProps> = ({
  courseCode = "CS202",
  filesCount = 9,
  files = [
    { id: "cs202-lec4", name: "Lecture 4.pdf", category: "Lecture Decks" },
    { id: "cs202-lab3", name: "Lab 3.pdf", category: "Lab Handouts" },
    { id: "cs202-tut1", name: "Tutorial 1.pdf", category: "Tutorials & PYQs" },
    {
      id: "cs202-planner",
      name: "Course Planner.pdf",
      category: "Course Planner",
    },
  ],
  categories = [
    "Course Planner",
    "Lecture Decks",
    "Lab Handouts",
    "Tutorials & PYQs",
  ],
  quickPrompts = ["Condense", "Quiz me", "Simplify", "Storyboard"],
  messages: controlledMessages,
  initialMessages,
  sessions = [],
  activeSessionId,
  isTyping: controlledIsTyping,
  onSendMessage,
  onCiteClick,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  onClearChat,
  onOpenDocument,
  className = "",
}) => {
  // Horizontal Resizing State
  const [width, setWidth] = useState<number>(340)
  const [isResizing, setIsResizing] = useState(false)

  // History Drawer State
  const [historyOpen, setHistoryOpen] = useState(false)

  // Selected Citation State for preview drawer
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(
    null
  )

  // Local fallback state when uncontrolled
  const [localCourseMessagesMap, setLocalCourseMessagesMap] = useState<
    Record<string, ChatMessage[]>
  >({})
  const [localIsTyping, setLocalIsTyping] = useState(false)

  const msgsEndRef = useRef<HTMLDivElement>(null)

  // Determine current active messages (controlled takes precedence)
  const currentMessages = useMemo(() => {
    if (controlledMessages !== undefined) return controlledMessages
    return localCourseMessagesMap[courseCode] ?? initialMessages ?? []
  }, [controlledMessages, localCourseMessagesMap, courseCode, initialMessages])

  const isTyping =
    controlledIsTyping !== undefined ? controlledIsTyping : localIsTyping

  // Horizontal Drag Resizing effect
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      if (newWidth >= 280 && newWidth <= 800) {
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  const scrollToBottom = () => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentMessages, isTyping, courseCode])

  const handleSend = async (fullQuery: string) => {
    if (!fullQuery.trim() || isTyping) return

    if (controlledMessages === undefined) {
      // Uncontrolled local update
      const userMsg: ChatMessage = {
        r: "me",
        role: "user",
        x: fullQuery,
        content: fullQuery,
      }
      setLocalCourseMessagesMap((prev) => ({
        ...prev,
        [courseCode]: [...(prev[courseCode] ?? initialMessages ?? []), userMsg],
      }))
    }

    if (onSendMessage) {
      if (controlledIsTyping === undefined) setLocalIsTyping(true)
      try {
        const res = await onSendMessage(fullQuery)
        if (controlledIsTyping === undefined) setLocalIsTyping(false)
        if (res && res.text && controlledMessages === undefined) {
          setLocalCourseMessagesMap((prev) => ({
            ...prev,
            [courseCode]: [
              ...(prev[courseCode] ?? initialMessages ?? []),
              {
                r: "ai",
                role: "assistant",
                x: res.text,
                content: res.text,
                cites: res.cites,
                citations: res.cites,
              },
            ],
          }))
        }
      } catch {
        if (controlledIsTyping === undefined) setLocalIsTyping(false)
      }
    } else {
      // Fallback mock response if no handler provided
      setLocalIsTyping(true)
      setTimeout(() => {
        setLocalIsTyping(false)
        const responseText = `I found grounded material in <b>${courseCode}</b> related to your query. You can inspect the citations below to view the source passage.`
        const responseCites: CitationItem[] = [
          {
            f: files[0]?.id || "f1",
            p: 1,
            l: `${files[0]?.name || "Document"} · p.1`,
            quote:
              "Key foundational definitions and theorems from the core syllabus.",
          },
        ]

        setLocalCourseMessagesMap((prev) => ({
          ...prev,
          [courseCode]: [
            ...(prev[courseCode] ?? initialMessages ?? []),
            {
              r: "ai",
              role: "assistant",
              x: responseText,
              content: responseText,
              cites: responseCites,
              citations: responseCites,
            },
          ],
        }))
      }, 600)
    }
  }

  const handleClear = () => {
    if (controlledMessages === undefined) {
      setLocalCourseMessagesMap((prev) => ({
        ...prev,
        [courseCode]: [],
      }))
    }
    setSelectedCitation(null)
    onClearChat?.()
  }

  const handleCitationClick = (cite: CitationItem) => {
    setSelectedCitation(cite)
    onCiteClick?.(cite)
  }

  const handleNewChatClick = () => {
    if (onNewChat) {
      onNewChat()
    } else {
      handleClear()
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-none">
      {/* Horizontal Drag Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`relative z-10 w-1.5 flex-none cursor-col-resize transition-colors hover:bg-(--acc,#52A8EA) ${
          isResizing ? "bg-(--acc,#52A8EA)" : "bg-(--line,#25313E)"
        }`}
        title="Drag horizontally to resize Chat panel"
      />

      {/* Main Chat Panel */}
      <aside
        style={{ width: `${width}px` }}
        className={`relative flex min-h-0 flex-col bg-(--bg-panel,#121A23) text-xs text-(--tx,#DCE3EA) select-none ${className}`}
      >
        {/* Top Header */}
        <div className="flex h-10 flex-none items-center justify-between border-b border-(--line-soft,#1B2530) bg-(--bg-bar,#101821)/50 px-3">
          <span className="font-mono text-xs text-(--tx-dim,#8B98A7)">
            {courseCode} · {filesCount} files
          </span>

          <div className="flex items-center gap-1.5">
            {/* History Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              title="Toggle Chat History"
              className={`relative cursor-pointer rounded p-1 transition-colors ${
                historyOpen
                  ? "bg-(--bg-hover,#213040) text-(--acc,#52A8EA)"
                  : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3.5v4.5l3 2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
              </svg>
            </button>

            {/* New Chat Button */}
            <button
              type="button"
              onClick={handleNewChatClick}
              title="Start new conversation"
              className="cursor-pointer rounded p-1 text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Clear Chat Button */}
            <button
              type="button"
              onClick={handleClear}
              title="Clear conversation"
              className="cursor-pointer rounded p-1 text-(--tx-dim,#8B98A7) transition-colors hover:bg-destructive/10 hover:text-destructive"
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
        </div>

        {/* History Drawer Overlay */}
        <History
          sessions={sessions}
          activeSessionId={activeSessionId}
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onSelectSession={(id) => onSelectSession?.(id)}
          onDeleteSession={(id) => onDeleteSession?.(id)}
          onNewChat={handleNewChatClick}
        />

        {/* Messages Container */}
        <div className="flex min-h-0 flex-1 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent] flex-col overflow-y-auto p-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-(--line,#25313E) [&::-webkit-scrollbar-track]:bg-transparent">
          {currentMessages.length === 0 ? (
            /* WELCOME HERO SCREEN */
            <div className="my-auto flex flex-1 animate-in flex-col items-center justify-center gap-3 p-3 text-center duration-300 fade-in">
              <img
                src="/ntbc-logo.png"
                alt="NotToBeCooked Logo"
                className="h-12 w-12 object-contain"
              />

              <div className="flex max-w-xs flex-col gap-1">
                <h3 className="text-base font-semibold tracking-tight text-(--tx,#DCE3EA)">
                  Ask anything about{" "}
                  <span className="font-bold text-(--acc,#52A8EA)">
                    {courseCode}
                  </span>
                </h3>
                <p className="text-xs leading-relaxed text-(--tx-dim,#8B98A7)">
                  Explore lectures, labs, and notes across{" "}
                  <span className="font-medium text-(--tx,#DCE3EA)">
                    {filesCount} course files
                  </span>
                  .
                </p>
              </div>

              {quickPrompts.length > 0 && (
                <div className="mt-2 flex w-full max-w-xs flex-col gap-1">
                  {quickPrompts.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isTyping}
                      onClick={() => handleSend(q)}
                      className="group flex cursor-pointer items-center justify-between rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-2.5 py-1.5 text-left text-xs text-(--tx-dim,#8B98A7) [outline:none] transition-colors outline-none hover:border-(--acc-deep,#1D5D8A) hover:text-(--tx,#DCE3EA) focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>{q}</span>
                      <span className="text-(--tx-faint,#5C6976) transition-colors group-hover:text-(--acc,#52A8EA)">
                        ↗
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* CONVERSATION STREAM */
            <div className="flex flex-col gap-3">
              {currentMessages.map((m, idx) => (
                <ChatMessageItem
                  key={m.id || idx}
                  message={m}
                  onCiteClick={handleCitationClick}
                />
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex w-full items-center py-1">
                  <div className="flex gap-1.5 py-0.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--acc,#52A8EA)" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--acc,#52A8EA) [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--acc,#52A8EA) [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={msgsEndRef} />
        </div>

        {/* Selected Citation Preview Drawer */}
        <CitationDrawer
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
          onOpenDocument={onOpenDocument}
        />

        {/* Input Composer */}
        <div className="flex-none p-2.5 pt-1">
          <ChatInput
            files={files}
            categories={categories}
            quickPrompts={currentMessages.length > 0 ? quickPrompts : []}
            isTyping={isTyping}
            onSend={handleSend}
          />
        </div>
      </aside>
    </div>
  )
}

export default Chat
