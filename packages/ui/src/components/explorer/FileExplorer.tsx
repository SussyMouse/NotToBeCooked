import React, { useState, useMemo, useEffect } from "react"
import type { MockDocumentFile } from "../../types/course"
import { FolderItem } from "./FolderItem"
import { FileItem } from "./FileItem"
import { Folder, Search } from "lucide-react"
import { RoadmapWidget } from "../roadmap/RoadmapWidget"
import { UploadDock } from "../upload/UploadDock"

interface FileExplorerProps {
  categories: string[]
  files: MockDocumentFile[]
  activeFileId: string | null
  courseWeek: number
  courseWeeks: number
  roadmapProgressPct: number
  nextMilestoneText: string
  onOpenFile: (file: MockDocumentFile) => void
  onOpenRoadmapModal: () => void
  onOpenBatchUpload: () => void
  onOpenDirectFolderUpload: (category: string) => void
  className?: string
  onRenameFile: (fileId: string, newFileName: string) => Promise<void> | void
}

export function FileExplorer({
  categories,
  files,
  activeFileId,
  courseWeek,
  courseWeeks,
  roadmapProgressPct,
  nextMilestoneText,
  onOpenFile,
  onRenameFile,
  onOpenRoadmapModal,
  onOpenBatchUpload,
  onOpenDirectFolderUpload,
  className = "",
}: FileExplorerProps) {
  // Horizontal Resizing State (Matching Chat.tsx dynamic width behavior)
  const [width, setWidth] = useState<number>(300)
  const [isResizing, setIsResizing] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>(
    {}
  )

  // Horizontal Drag Resizing effect
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX
      if (newWidth >= 220 && newWidth <= 600) {
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  // Filtered files based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files
    const q = searchQuery.toLowerCase()
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.category && f.category.toLowerCase().includes(q))
    )
  }, [files, searchQuery])

  const toggleCategory = (cat: string) => {
    setCollapsedCats((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }))
  }

  return (
    <div className="relative flex h-full min-h-0 flex-none select-none">
      <aside
        style={{ width: `${width}px` }}
        className={`flex min-h-0 flex-col bg-(--bg-panel,#121A23) text-xs text-(--tx,#DCE3EA) ${className}`}
      >
        {/* File Explorer Header & Search */}
        <div className="flex flex-col gap-2 border-b border-(--line-soft,#1B2530) p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-(--tx-dim,#8B98A7) uppercase">
              <Folder className="h-3.5 w-3.5 text-(--acc,#52A8EA)" />
              Explorer
            </span>
            <span className="font-mono text-xs text-(--tx-faint,#5C6976)">
              {files.length} files
            </span>
          </div>

          {/* Minimalist Search Box */}
          <div className="flex items-center gap-2 rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833)/80 px-2.5 py-1.5 text-xs">
            <Search className="h-3.5 w-3.5 text-(--tx-faint,#5C6976)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-transparent text-xs text-(--tx,#DCE3EA) outline-none placeholder:text-(--tx-faint,#5C6976)"
            />
          </div>
        </div>

        {/* Tree View Container: Categories & Files */}
        <div className="flex min-h-0 flex-1 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent] flex-col gap-2 overflow-y-auto p-2.5">
          {/* Folders header */}
          <div className="px-1 font-mono text-[11px] font-semibold tracking-wider text-(--tx-faint,#5C6976) uppercase">
            <span>Folders</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {categories.map((cat) => {
              const filesInCat = filteredFiles.filter((f) => f.category === cat)
              const isCollapsed = collapsedCats[cat] || false

              return (
                <FolderItem
                  key={cat}
                  category={cat}
                  fileCount={filesInCat.length}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleCategory(cat)}
                  onDirectUpload={onOpenDirectFolderUpload}
                >
                  {filesInCat.length === 0 ? (
                    <span className="px-2 py-1 font-mono text-[11px] text-(--tx-faint,#5C6976) italic">
                      No documents
                    </span>
                  ) : (
                    filesInCat.map((file) => (
                      <FileItem
                        key={file.id}
                        file={file}
                        isActive={activeFileId === file.id}
                        onOpenFile={onOpenFile}
                        onRenameFile={onRenameFile}
                      />
                    ))
                  )}
                </FolderItem>
              )
            })}
          </div>
        </div>

        {/* Bottom Explorer: Unified Minimalist Roadmap & Upload Dock */}
        <div className="flex flex-col gap-2.5 border-t border-(--line,#25313E) bg-(--bg-bar,#101821)/70 p-3">
          <RoadmapWidget
            week={courseWeek}
            weeks={courseWeeks}
            progressPct={roadmapProgressPct}
            nextMilestoneText={nextMilestoneText}
            onOpenRoadmap={onOpenRoadmapModal}
          />
          <UploadDock onOpenBatchUpload={onOpenBatchUpload} />
        </div>
      </aside>

      {/* Horizontal Drag Resize Handle on Right Edge */}
      <div
        onMouseDown={handleMouseDown}
        className={`relative z-10 w-1.5 flex-none cursor-col-resize transition-colors hover:bg-(--acc,#52A8EA) ${
          isResizing ? "bg-(--acc,#52A8EA)" : "bg-(--line,#25313E)"
        }`}
        title="Drag horizontally to resize File Explorer"
      />
    </div>
  )
}
