import React, { useState } from "react"
import type { CitationItem } from "./ChatMessage"
import { Check, X, ExternalLink } from "lucide-react"

export interface CitationDrawerProps {
  citation: CitationItem | null
  onClose: () => void
  onOpenDocument?: (fileId: string, page: number) => void
  className?: string
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({
  citation,
  onClose,
  onOpenDocument,
  className = "",
}) => {
  const [copied, setCopied] = useState(false)

  if (!citation) return null

  const handleCopyQuote = () => {
    if (!citation.quote && !citation.l) return
    navigator.clipboard.writeText(citation.quote || citation.l)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={`flex animate-in flex-col gap-2 border-t border-(--cite-line,rgba(227,166,63,0.38)) bg-(--cite-bg,rgba(227,166,63,0.08)) p-3 text-xs duration-200 slide-in-from-bottom ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-(--cite,#E3A63F)">
          <Check className="h-3 w-3" />
          <span>Grounded Citation: {citation.l}</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Close citation preview"
          className="cursor-pointer rounded p-1 text-(--tx-faint,#5C6976) transition-colors hover:text-(--tx,#DCE3EA)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Quote / Excerpt */}
      {citation.quote ? (
        <div className="rounded border border-(--cite-line,rgba(227,166,63,0.25)) bg-(--bg-panel,#121A23)/60 p-2 text-[11.5px] leading-relaxed text-(--tx,#DCE3EA) italic">
          &ldquo;{citation.quote}&rdquo;
        </div>
      ) : (
        <p className="text-[11.5px] leading-relaxed text-(--tx-dim,#8B98A7)">
          Grounding verified in{" "}
          <strong className="text-(--tx,#DCE3EA)">{citation.l}</strong>. Click
          below to view the source passage in context.
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleCopyQuote}
          className="flex cursor-pointer items-center gap-1 text-[10.5px] text-(--tx-dim,#8B98A7) transition-colors hover:text-(--tx,#DCE3EA)"
        >
          <span>{copied ? "Copied ✓" : "Copy Quote"}</span>
        </button>

        {onOpenDocument && (
          <button
            type="button"
            onClick={() => onOpenDocument(citation.f, citation.p)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-(--cite,#E3A63F) px-2.5 py-1 text-[11px] font-semibold text-black shadow-xs transition-opacity hover:opacity-90"
          >
            <span>Open Document (p.{citation.p})</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export default CitationDrawer
