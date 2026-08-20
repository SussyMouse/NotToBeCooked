import type { MockDocumentFile } from "../../types/course"

interface FileItemProps {
  file: MockDocumentFile
  isActive: boolean
  isOpenInTab: boolean
  onOpenFile: (file: MockDocumentFile) => void
}

export function FileItem({
  file,
  isActive,
  isOpenInTab,
  onOpenFile,
}: FileItemProps) {
  return (
    <button
      type="button"
      onClick={() => onOpenFile(file)}
      className={`group flex cursor-pointer items-center justify-between gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
        isActive
          ? "border border-(--acc,#52A8EA)/30 bg-(--bg-raise,#1C2833) font-medium text-(--acc,#52A8EA)"
          : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040)/60 hover:text-(--tx,#DCE3EA)"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-(--tx-faint,#5C6976) group-hover:text-(--acc,#52A8EA)"
        >
          <path
            d="M4 2h5.5L13 5.5V14H4V2z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 2v4h4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="truncate text-xs font-normal">{file.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-(--tx-faint,#5C6976)">
        <span>{file.size}</span>
        {isOpenInTab && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-(--acc,#52A8EA)"
            title="Open in active tab"
          />
        )}
      </div>
    </button>
  )
}
