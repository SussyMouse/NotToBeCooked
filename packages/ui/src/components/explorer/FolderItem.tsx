import { useState, type ReactNode } from "react"
import {
  ChevronRight,
  FileUp,
  Folder,
  FolderOpen,
  FolderPen,
  FolderPlus,
  MoreVertical,
  Trash2,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu"
import { CreateFolderDialog } from "./CreateFolderDialog"

interface FolderItemProps {
  category: string
  fileCount: number
  isCollapsed: boolean
  onToggle: () => void
  onDirectUpload: (category: string) => void
  onCreateSubfolder: (
    parentFolder: string,
    folderName: string
  ) => Promise<void> | void
  onRenameFolder: (category: string) => void
  onDeleteFolder: (category: string) => void
  children: ReactNode
}

export function FolderItem({
  category,
  fileCount,
  isCollapsed,
  onToggle,
  onDirectUpload,
  onCreateSubfolder,
  onRenameFolder,
  onDeleteFolder,
  children,
}: FolderItemProps) {
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col">
        <div className="group flex h-8 items-center rounded-sm text-xs text-(--tx-dim,#8B98A7) transition-colors hover:bg-(--bg-hover,#213040)/40">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!isCollapsed}
            className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-sm px-1.5 text-left focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-(--acc,#52A8EA) focus-visible:outline-none"
          >
            <ChevronRight
              className={`h-3.5 w-3.5 shrink-0 text-(--tx-faint,#5C6976) transition-transform duration-150 ${
                isCollapsed ? "" : "rotate-90"
              }`}
            />

            {isCollapsed ? (
              <Folder className="h-4 w-4 shrink-0 text-(--acc,#52A8EA)/90" />
            ) : (
              <FolderOpen className="h-4 w-4 shrink-0 text-(--acc,#52A8EA)" />
            )}

            <span className="min-w-0 flex-1 truncate font-semibold text-(--tx,#DCE3EA)">
              {category}
            </span>

            <span className="font-mono text-[11px] text-(--tx-faint,#5C6976)">
              {fileCount}
            </span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Open actions for ${category}`}
              title={`Actions for ${category}`}
              className="mr-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--tx-faint,#5C6976) transition-colors hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA) focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-(--acc,#52A8EA) focus-visible:outline-none"
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              sideOffset={4}
              className="w-44 border-(--line,#25313E) bg-(--bg-panel,#121A23) text-(--tx,#DCE3EA)"
            >
              <DropdownMenuItem
                onClick={() => onDirectUpload(category)}
                className="cursor-pointer text-xs"
              >
                <FileUp className="h-4 w-4" />
                Upload here
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setIsCreateFolderOpen(true)}
                className="cursor-pointer text-xs"
              >
                <FolderPlus className="h-4 w-4" />
                New subfolder
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onRenameFolder(category)}
                className="cursor-pointer text-xs"
              >
                <FolderPen className="h-4 w-4" />
                Rename folder
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onDeleteFolder(category)}
                className="cursor-pointer text-xs text-(--danger-tx,#F0A19D)"
              >
                <Trash2 className="h-4 w-4" />
                Delete folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!isCollapsed && (
          <div className="-mt-0.5 ml-3.25 flex flex-col gap-0.5 border-l border-(--line-soft,#1B2530) pl-3">
            {children}
          </div>
        )}
      </div>

      {isCreateFolderOpen && (
        <CreateFolderDialog
          open
          parentFolder={category}
          onOpenChange={setIsCreateFolderOpen}
          onCreate={(folderName) => onCreateSubfolder(category, folderName)}
        />
      )}
    </>
  )
}
