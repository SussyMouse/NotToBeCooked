import type { ReactNode } from "react"

interface FolderItemProps {
  category: string
  fileCount: number
  isCollapsed: boolean
  onToggle: () => void
  onDirectUpload: (category: string) => void
  children: ReactNode
}

export function FolderItem({
  category,
  fileCount,
  isCollapsed,
  onToggle,
  onDirectUpload,
  children,
}: FolderItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {/* Category / Folder Header */}
      <div
        onClick={onToggle}
        className="group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040)/40 hover:text-(--tx,#DCE3EA)"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 truncate pr-2">
          <span
            className={`text-[10px] text-(--tx-faint,#5C6976) transition-transform duration-150 ${
              isCollapsed ? "" : "rotate-90"
            }`}
          >
            ▶
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-(--acc,#52A8EA)/85"
          >
            <path
              d="M2 4.5A1.5 1.5 0 013.5 3h2.6l1.2 1.5h5.2A1.5 1.5 0 0114 6v5.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z"
              stroke="currentColor"
              strokeWidth="1.3"
            />
          </svg>
          <span className="truncate text-xs font-semibold text-(--tx,#DCE3EA)">
            {category}
          </span>
        </div>

        {/* Fixed Dimension Action Container (Zero layout displacement on hover) */}
        <div className="relative flex h-4 w-5 shrink-0 items-center justify-end">
          <span className="font-mono text-xs text-(--tx-faint,#5C6976) transition-opacity duration-150 group-hover:opacity-0">
            {fileCount}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDirectUpload(category)
            }}
            title={`Upload to ${category}`}
            className="absolute inset-0 flex cursor-pointer items-center justify-end pr-0.5 text-xs font-bold text-(--tx-dim,#8B98A7) opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-(--acc,#52A8EA)"
          >
            +
          </button>
        </div>
      </div>

      {/* Children list (FileItems) */}
      {!isCollapsed && (
        <div className="ml-3.5 flex flex-col gap-1 border-l border-(--line-soft,#1B2530) pt-0.5 pl-2">
          {children}
        </div>
      )}
    </div>
  )
}
