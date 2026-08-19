import React, { useState } from "react";
import type { CitationItem } from "./ChatMessage";

export interface CitationDrawerProps {
  citation: CitationItem | null;
  onClose: () => void;
  onOpenDocument?: (fileId: string, page: number) => void;
  className?: string;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({
  citation,
  onClose,
  onOpenDocument,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  const handleCopyQuote = () => {
    if (!citation.quote && !citation.l) return;
    navigator.clipboard.writeText(citation.quote || citation.l);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`border-t border-(--cite-line,rgba(227,166,63,0.38)) bg-(--cite-bg,rgba(227,166,63,0.08)) p-3 text-xs flex flex-col gap-2 animate-in slide-in-from-bottom duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-(--cite,#E3A63F) font-mono font-semibold text-[11px]">
          <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5.2l2 2 4-4.4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Grounded Citation: {citation.l}</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Close citation preview"
          className="text-(--tx-faint,#5C6976) hover:text-(--tx,#DCE3EA) p-1 rounded transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Quote / Excerpt */}
      {citation.quote ? (
        <div className="bg-(--bg-panel,#121A23)/60 border border-(--cite-line,rgba(227,166,63,0.25)) rounded p-2 text-(--tx,#DCE3EA) text-[11.5px] italic leading-relaxed">
          &ldquo;{citation.quote}&rdquo;
        </div>
      ) : (
        <p className="text-[11.5px] text-(--tx-dim,#8B98A7) leading-relaxed">
          Grounding verified in <strong className="text-(--tx,#DCE3EA)">{citation.l}</strong>. Click below to view the source passage in context.
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleCopyQuote}
          className="text-[10.5px] text-(--tx-dim,#8B98A7) hover:text-(--tx,#DCE3EA) flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>{copied ? "Copied ✓" : "Copy Quote"}</span>
        </button>

        {onOpenDocument && (
          <button
            type="button"
            onClick={() => onOpenDocument(citation.f, citation.p)}
            className="inline-flex items-center gap-1 bg-(--cite,#E3A63F) text-black font-semibold rounded px-2.5 py-1 text-[11px] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <span>Open Document (p.{citation.p})</span>
            <span>↗</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CitationDrawer;
