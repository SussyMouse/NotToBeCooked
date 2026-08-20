import React from "react"
import type { Tab } from "../../store/workspace"
import { FileIcon } from "../explorer/FileItem"

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

    return (
      <div
        role="tab"
        aria-selected={isActive}
        title={tab.filename}
        onClick={() => onSelect(tab)}
        onAuxClick={handleAuxClick}
        onMouseDown={handleMouseDown}
        className={`group relative flex w-36 shrink-0 cursor-default select-none items-center gap-1.5 rounded-t-md pl-2 pr-1 py-1.5 text-xs transition-colors sm:w-44 ${
          isActive
            ? "bg-(--tx-strong,#EDF2F6) font-semibold text-slate-900 shadow-sm"
            : "bg-[#182432] text-(--tx-dim,#8B98A7) hover:bg-[#223347] hover:text-white shadow-xs"
        }`}
      >
        <FileIcon filename={tab.filename} className="h-3.5 w-3.5 shrink-0" />

        {/* CRITICAL UX REQUIREMENT: Full-width label; extends under hover-only close overlay style must remains unchanged unless told */}
        <span className="min-w-0 flex-1 truncate text-xs">{tab.filename}</span>

        {/* CRITICAL UX REQUIREMENT: Hover-only close overlay; blends seamlessly into tab surface, style must remains unchanged unless told */}
        <div
          className={`absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end pl-px pr-1.5 rounded-r-md opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 ${
            isActive
              ? "bg-(--tx-strong,#EDF2F6)"
              : "bg-[#223347]"
          }`}
        >
          <button
            type="button"
            title="Close tab (Middle click)"
            onClick={(e) => {
              e.stopPropagation()
              onClose(tab.fileId)
            }}
            className={`pointer-events-auto flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full transition-colors ${
              isActive
                ? "text-slate-600 hover:bg-slate-300 hover:text-slate-900"
                : "text-(--tx-faint,#5C6976) hover:bg-(--line,#25313E) hover:text-white"
            }`}
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 10 10"
              fill="none"
              className="stroke-current"
            >
              <path
                d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    )
  }
)

TabItem.displayName = "TabItem"
