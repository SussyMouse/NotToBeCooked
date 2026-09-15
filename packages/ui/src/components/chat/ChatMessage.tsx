import React from "react"
import { MarkdownContent } from "./MarkdownContent"
import { FileText, Folder, Check } from "lucide-react"

import {
  type CitationItem,
  groupCitations,
} from "../../lib/citations.ts"

export { type CitationItem, groupCitations }

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
            <FileText className="inline-block shrink-0 align-sub h-3.5 w-3.5 text-(--acc,#52A8EA)" />
          ) : (
            <Folder className="inline-block shrink-0 align-sub h-3.5 w-3.5 text-(--acc,#52A8EA)" />
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
          <FileText className="inline-block shrink-0 align-sub h-3.5 w-3.5 text-(--acc,#52A8EA)" />
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
        className={`text-[13.5px] leading-relaxed select-text ${
          isMe
            ? "max-w-[85%] rounded-lg rounded-tr-xs border border-[rgba(var(--acc-rgb,82,168,234),0.25)] bg-[rgba(var(--acc-rgb,82,168,234),0.12)] px-3 py-2 text-(--acc-tx-soft,#A8D4F2)"
            : "w-full py-0.5 text-justify text-(--tx,#DCE3EA)"
        } ${isOptimistic ? "animate-pulse opacity-70" : ""}`}
      >
        {isMe ? (
          <div className="whitespace-pre-wrap select-text">
            {renderMentionized(rawText)}
          </div>
        ) : (
          <MarkdownContent
            content={rawText}
            citations={citations}
            onCiteClick={onCiteClick}
            className="select-text"
          />
        )}

        {/* Citations List (One pill per source marker) */}
        {citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-(--line-soft,#1B2530)/60 pt-1">
            {citations.map((cite, cIdx) => (
              <button
                key={cite.marker ?? cIdx}
                type="button"
                onClick={() => onCiteClick?.(cite)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-(--cite-line,rgba(227,166,63,0.38)) bg-(--cite-bg,rgba(227,166,63,0.09)) px-2 py-0.5 font-mono text-[10.5px] text-(--cite,#E3A63F) [outline:none] transition-colors outline-none hover:bg-[rgba(227,166,63,0.19)] focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
              >
                <Check className="h-2.5 w-2.5" />
                <span>
                  {cite.marker ? `[${cite.marker}] ` : ""}
                  {cite.l}
                  {cite.quotes && cite.quotes.length > 1
                    ? ` (${cite.quotes.length})`
                    : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessageItem
