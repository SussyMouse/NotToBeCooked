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
    <div className="flex flex-col">
      {/* Category / Folder Header */}
      <div
        onClick={onToggle}
        className="group flex h-7 cursor-pointer items-center justify-between rounded px-1.5 py-0.5 text-xs text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040)/40 hover:text-(--tx,#DCE3EA)"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 truncate pr-1">
          <span
            className={`flex w-3.5 shrink-0 items-center justify-center text-[9px] text-(--tx-faint,#5C6976) transition-transform duration-150 ${
              isCollapsed ? "" : "rotate-90"
            }`}
          >
            ▶
          </span>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="h-4.5 w-4.5 shrink-0 text-(--acc,#52A8EA)/90"
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

        {/* Action Container */}
        <div className="relative flex h-full w-5 shrink-0 items-center justify-end">
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

      {/* Children list (FileItems) with exact pixel alignment matching folder icon */}
      {!isCollapsed && (
        <div className="-mt-0.5 ml-[13px] flex flex-col gap-0.5 border-l border-(--line-soft,#1B2530) pl-3">
          {children}
        </div>
      )}
    </div>
  )
}
