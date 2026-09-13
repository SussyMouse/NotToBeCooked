import React from "react"
import type { Tab } from "../../store/workspace"
import { FileIcon } from "../explorer/FileItem"
import { X } from "lucide-react"

export interface TabItemProps {
  tab: Tab
  isActive: boolean
  onSelect: (tab: Tab) => void
  onClose: (fileId: string) => void
}

export const TabItem: React.FC<TabItemProps> = React.memo(
  ({ tab, isActive, onSelect, onClose }) => {
    const handleAuxClick = (e: React.MouseEvent) => {
      if (e.button === 1) {
        // Middle click closes tab
        e.preventDefault()
        e.stopPropagation()
        onClose(tab.fileId)
      }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button === 1) {
        // Prevent default middle click scroll behavior
        e.preventDefault()
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onSelect(tab)
      }
    }
    return (
      <div
        role="tab"
        aria-label={tab.filename}
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        title={tab.filename}
        onClick={() => onSelect(tab)}
        onKeyDown={handleKeyDown}
        onAuxClick={handleAuxClick}
        onMouseDown={handleMouseDown}
        className={`group relative flex w-36 shrink-0 cursor-pointer items-center gap-1.5 rounded-none py-1.5 pr-1.5 pl-2.5 text-xs transition-colors select-none sm:w-44 ${
          isActive
            ? "bg-(--bg-canvas,#161F29) font-semibold text-(--tx,#DCE3EA) shadow-xs before:absolute before:top-0 before:right-0 before:left-0 before:z-20 before:h-0.5 before:bg-(--acc,#52A8EA)"
            : "bg-transparent text-(--tx-dim,#8B98A7) hover:bg-(--bg-raise,#1C2833)/70 hover:text-(--tx,#DCE3EA)"
        }`}
      >
        <FileIcon filename={tab.filename} className="h-3.5 w-3.5 shrink-0" />

        {/* Full-width label */}
        <span className="min-w-0 flex-1 truncate text-xs">{tab.filename}</span>

        {/* Hover-only close overlay; positioned below the top outline so it never covers the accent line */}
        <div
          className={`pointer-events-none absolute top-0 right-0 bottom-0 z-10 flex items-center justify-end rounded-none pr-1.5 pl-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 ${
            isActive ? "bg-(--bg-canvas,#161F29)" : "bg-(--bg-raise,#1C2833)"
          }`}
        >
          <button
            type="button"
            aria-label={`Close ${tab.filename}`}
            title="Close tab (Middle click)"
            onClick={(e) => {
              e.stopPropagation()
              onClose(tab.fileId)
            }}
            className="pointer-events-auto flex h-4.5 w-4.5 shrink-0 cursor-pointer items-center justify-center rounded-full text-(--tx-faint,#5C6976) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA)"
          >
            <X className="h-3 w-3 stroke-[2.2]" />
          </button>
        </div>
      </div>
    )
  }
)

TabItem.displayName = "TabItem"
