import { FileText, MoreVertical } from "lucide-react"

import type { MockDocumentFile } from "../../types/course"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu"
import { FileStatusBadge } from "./FileStatusBadge"

interface FileItemProps {
  file: MockDocumentFile
  isActive: boolean
  onOpenFile: (file: MockDocumentFile) => void
}

export function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ""
}

export function FileIcon({
  filename,
  className,
}: {
  filename: string
  className?: string
}) {
  const ext = getFileExtension(filename)
  const defaultClasses = className || "h-4.5 w-4.5 shrink-0"

  switch (ext) {
    case "pdf":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${defaultClasses} text-red-400/90`}
        >
          <path
            d="M4 2h5.5L13 5.5V14H4V2z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 2v4h4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="5"
            y="11"
            fontSize="4"
            fontWeight="700"
            fill="currentColor"
            fontFamily="sans-serif"
          >
            PDF
          </text>
        </svg>
      )

    case "txt":
    case "md":
    case "markdown":
      return <FileText className={`${defaultClasses} text-blue-400/90`} />

    case "doc":
    case "docx":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${defaultClasses} text-sky-400/90`}
        >
          <path
            d="M4 2h5.5L13 5.5V14H4V2z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="4.5"
            y="11"
            fontSize="3.8"
            fontWeight="700"
            fill="currentColor"
            fontFamily="sans-serif"
          >
            DOC
          </text>
        </svg>
      )

    case "ppt":
    case "pptx":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${defaultClasses} text-amber-400/90`}
        >
          <path
            d="M4 2h5.5L13 5.5V14H4V2z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="4.8"
            y="11"
            fontSize="3.8"
            fontWeight="700"
            fill="currentColor"
            fontFamily="sans-serif"
          >
            PPT
          </text>
        </svg>
      )

    case "xls":
    case "xlsx":
    case "csv":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${defaultClasses} text-emerald-400/90`}
        >
          <path
            d="M4 2h5.5L13 5.5V14H4V2z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 7.5h4M6 9.5h4M6 11.5h4"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </svg>
      )

    case "py":
    case "ts":
    case "tsx":
    case "js":
    case "json":
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${defaultClasses} text-teal-400/90`}
        >
          <path
            d="M4 2h5.5L13 5.5V14H4V2z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.5 8l-1.5 1.5 1.5 1.5M9.5 8l1.5 1.5-1.5 1.5"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )

    default:
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${defaultClasses} text-(--tx-faint,#5C6976)`}
        >
          <path
            d="M4 2h5.5L13 5.5V14H4V2z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 2v4h4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

export function FileItem({ file, isActive, onOpenFile }: FileItemProps) {
  return (
    <div
      className={`group relative flex h-10 w-full items-center rounded-sm border-l-[3px] transition-colors ${
        isActive
          ? "border-l-(--acc,#52A8EA) bg-(--acc,#52A8EA)/10 text-(--acc,#52A8EA)"
          : "border-l-transparent text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040)/50 hover:text-(--tx,#DCE3EA)"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpenFile(file)}
        aria-current={isActive ? "page" : undefined}
        className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm py-1 pr-1 pl-2 text-left focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-(--acc,#52A8EA) focus-visible:outline-none"
      >
        <FileIcon filename={file.name} />

        <span className="min-w-0 flex-1 truncate text-xs">{file.name}</span>

        <FileStatusBadge status={file.status ?? "ready"} />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Open actions for ${file.name}`}
          title={`Actions for ${file.name}`}
          className="mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--tx-faint,#5C6976) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA) focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-(--acc,#52A8EA) focus-visible:outline-none"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="w-40 border-(--line,#25313E) bg-(--bg-panel,#121A23) text-(--tx,#DCE3EA)"
        >
          <DropdownMenuItem
            onClick={() => onOpenFile(file)}
            className="cursor-pointer text-xs"
          >
            <FileText className="h-4 w-4" />
            Open file
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
