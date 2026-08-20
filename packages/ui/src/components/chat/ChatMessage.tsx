import React from "react"

export interface CitationItem {
  f: string // file id
  p: number // page
  b?: string // block id / chunk id
  l: string // display label e.g. "Lecture 4 · p.1"
  quote?: string // verbatim quote
}

export interface ChatMessage {
  id?: string
  role?: "user" | "assistant"
  r?: "ai" | "me" // legacy compatibility
  content?: string
  x?: string // legacy compatibility
  cites?: CitationItem[]
  citations?: CitationItem[]
  grounded?: boolean
  isOptimistic?: boolean
  status?: "pending" | "sent" | "error"
  createdAt?: string | Date
}

export interface ChatMessageProps {
  message: ChatMessage
  onCiteClick?: (cite: CitationItem) => void
  className?: string
}

export function renderMentionized(text: string): React.ReactNode {
  // Matches confirmed atomic mentions @[Filename or Category] OR standard @word
  const parts = text.split(/(@\[[^\]]+\]|@[^\s]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith("@[") && part.endsWith("]")) {
      const label = part.slice(2, -1)
      const isPdf =
        label.toLowerCase().endsWith(".pdf") ||
        label.toLowerCase().includes("doc") ||
        label.toLowerCase().includes("pdf")
      return (
        <span
          key={i}
          className="mx-0.5 inline-flex items-center gap-1 font-medium text-(--acc,#52A8EA) select-none"
        >
          {isPdf ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              className="inline-block shrink-0 align-sub text-(--acc,#52A8EA)"
            >
              <path
                d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-6.5L9.5 2h-6z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 2v4h4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              className="inline-block shrink-0 align-sub text-(--acc,#52A8EA)"
            >
              <path
                d="M2 4a1 1 0 011-1h3.5L8 4.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <span>{label}</span>
        </span>
      )
    } else if (part.startsWith("@")) {
      const label = part.slice(1)
      return (
        <span
          key={i}
          className="mx-0.5 inline-flex items-center gap-1 font-medium text-(--acc,#52A8EA) select-none"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            className="inline-block shrink-0 align-sub text-(--acc,#52A8EA)"
          >
            <path
              d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-6.5L9.5 2h-6z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 2v4h4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{label}</span>
        </span>
      )
    }
    return part
  })
}

export const ChatMessageItem: React.FC<ChatMessageProps> = ({
  message,
  onCiteClick,
  className = "",
}) => {
  const isMe = message.role === "user" || message.r === "me"
  const rawText = message.content ?? message.x ?? ""
  const citations = message.citations ?? message.cites ?? []
  const isOptimistic = message.isOptimistic || message.status === "pending"

  return (
    <div
      className={`flex flex-col gap-0.5 ${
        isMe ? "items-end" : "w-full items-start"
      } ${className}`}
    >
      {/* User Bubble or Assistant Full-width Text */}
      <div
        className={`text-[13.5px] leading-relaxed ${
          isMe
            ? "max-w-[85%] rounded-lg rounded-tr-xs border border-[rgba(var(--acc-rgb,82,168,234),0.25)] bg-[rgba(var(--acc-rgb,82,168,234),0.12)] px-3 py-2 text-(--acc-tx-soft,#A8D4F2)"
            : "w-full py-0.5 text-justify text-(--tx,#DCE3EA)"
        } ${isOptimistic ? "animate-pulse opacity-70" : ""}`}
      >
        {isMe ? (
          <div className="whitespace-pre-wrap">
            {renderMentionized(rawText)}
          </div>
        ) : (
          <div
            className="prose prose-invert max-w-none text-xs leading-relaxed"
            dangerouslySetInnerHTML={{ __html: rawText }}
          />
        )}

        {/* Citations List */}
        {citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-(--line-soft,#1B2530)/60 pt-1">
            {citations.map((cite, cIdx) => (
              <button
                key={cIdx}
                type="button"
                onClick={() => onCiteClick?.(cite)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-(--cite-line,rgba(227,166,63,0.38)) bg-(--cite-bg,rgba(227,166,63,0.09)) px-2 py-0.5 font-mono text-[10.5px] text-(--cite,#E3A63F) [outline:none] transition-colors outline-none hover:bg-[rgba(227,166,63,0.19)] focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
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
                <span>{cite.l}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessageItem
