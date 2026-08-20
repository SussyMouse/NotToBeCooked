import React, { useState, useMemo } from "react"

export interface ChatSessionItem {
  id: string
  title: string
  courseId?: string
  updatedAt?: string | Date
  createdAt?: string | Date
  messageCount?: number
}

export interface HistoryProps {
  sessions?: ChatSessionItem[]
  activeSessionId?: string | null
  isOpen: boolean
  onClose: () => void
  onSelectSession: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onNewChat?: () => void
  className?: string
}

function formatDate(dateValue?: string | Date): string {
  if (!dateValue) return ""
  try {
    const d = typeof dateValue === "string" ? new Date(dateValue) : dateValue
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

export const History: React.FC<HistoryProps> = ({
  sessions = [],
  activeSessionId,
  isOpen,
  onClose,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  className = "",
}) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)

  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions
    const q = searchTerm.toLowerCase()
    return sessions.filter((s) => s.title.toLowerCase().includes(q))
  }, [sessions, searchTerm])

  if (!isOpen) return null

  const handleDeleteConfirm = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onDeleteSession?.(id)
    setSessionToDelete(null)
  }

  return (
    <div
      className={`absolute inset-0 z-20 flex min-h-0 animate-in flex-col bg-(--bg-panel,#121A23) text-(--tx,#DCE3EA) duration-200 fade-in slide-in-from-right ${className}`}
    >
      {/* Header */}
      <div className="flex h-10 flex-none items-center justify-between border-b border-(--line-soft,#1B2530) px-3">
        <div className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className="text-(--acc,#52A8EA)"
          >
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
          <span className="text-xs font-semibold text-(--tx,#DCE3EA)">
            Chat History
          </span>
          <span className="py-0.2 rounded border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-1.5 font-mono text-[10px] text-(--tx-faint,#5C6976)">
            {sessions.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onNewChat && (
            <button
              type="button"
              onClick={() => {
                onNewChat()
                onClose()
              }}
              title="Start New Chat"
              className="flex cursor-pointer items-center gap-1 rounded p-1 text-[11px] text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--acc,#52A8EA)"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span>New</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close History"
            className="cursor-pointer rounded p-1 text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b border-(--line-soft,#1B2530) p-2">
        <div className="flex items-center gap-1.5 rounded border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-2 py-1 text-xs text-(--tx,#DCE3EA)">
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-(--tx-faint,#5C6976)"
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-transparent text-xs text-(--tx,#DCE3EA) outline-none placeholder:text-(--tx-faint,#5C6976)"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="text-xs text-(--tx-faint,#5C6976) hover:text-(--tx,#DCE3EA)"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Session List */}
      <div className="flex min-h-0 flex-1 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent] flex-col gap-1 overflow-y-auto p-2">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-(--tx-faint,#5C6976)">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="opacity-40"
            >
              <path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <p className="text-xs">No conversations found</p>
          </div>
        ) : (
          filteredSessions.map((s) => {
            const isActive = s.id === activeSessionId
            const isConfirmingDelete = sessionToDelete === s.id

            return (
              <div
                key={s.id}
                onClick={() => {
                  onSelectSession(s.id)
                  onClose()
                }}
                className={`group flex cursor-pointer items-center justify-between rounded-lg p-2 text-xs transition-colors ${
                  isActive
                    ? "border border-[rgba(var(--acc-rgb,82,168,234),0.25)] bg-(--bg-raise,#1C2833) font-medium text-(--acc,#52A8EA)"
                    : "border border-transparent text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col pr-2">
                  <span className="truncate">{s.title || "Untitled Chat"}</span>
                  <span className="mt-0.5 font-mono text-[10px] text-(--tx-faint,#5C6976)">
                    {formatDate(s.updatedAt || s.createdAt)}
                  </span>
                </div>

                {/* Delete / Actions */}
                {onDeleteSession && (
                  <div className="flex shrink-0 items-center gap-1">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteConfirm(e, s.id)}
                          className="text-destructive-foreground rounded bg-destructive px-1.5 py-0.5 text-[10px] hover:opacity-90"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSessionToDelete(null)
                          }}
                          className="p-1 text-(--tx-faint,#5C6976) hover:text-(--tx,#DCE3EA)"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSessionToDelete(s.id)
                        }}
                        title="Delete conversation"
                        className="rounded p-1 text-(--tx-faint,#5C6976) opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M3 4h8M5.6 4V2.8h2.8V4M4.2 4l.5 7.2h4.6L9.8 4"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default History
