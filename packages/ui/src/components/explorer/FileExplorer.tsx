import { useState, useMemo } from "react"
import type { MockDocumentFile } from "../../types/course"
import { FolderItem } from "./FolderItem"
import { FileItem } from "./FileItem"
import { RoadmapWidget } from "../roadmap/RoadmapWidget"
import { UploadDock } from "../upload/UploadDock"

interface FileExplorerProps {
  categories: string[]
  files: MockDocumentFile[]
  activeFileId: string | null
  openedFileIds: string[]
  courseWeek: number
  courseWeeks: number
  roadmapProgressPct: number
  nextMilestoneText: string
  onOpenFile: (file: MockDocumentFile) => void
  onOpenRoadmapModal: () => void
  onOpenBatchUpload: () => void
  onOpenDirectFolderUpload: (category: string) => void
}

export function FileExplorer({
  categories,
  files,
  activeFileId,
  openedFileIds,
  courseWeek,
  courseWeeks,
  roadmapProgressPct,
  nextMilestoneText,
  onOpenFile,
  onOpenRoadmapModal,
  onOpenBatchUpload,
  onOpenDirectFolderUpload,
}: FileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>(
    {}
  )

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
    <aside className="flex min-h-0 w-72 flex-none flex-col border-r border-(--line,#25313E) bg-(--bg-panel,#121A23)">
      {/* File Explorer Header & Search */}
      <div className="flex flex-col gap-2.5 border-b border-(--line-soft,#1B2530) p-3.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-(--tx-dim,#8B98A7) uppercase">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="text-(--acc,#52A8EA)"
            >
              <path
                d="M2 4a1 1 0 011-1h3l1.5 2H13a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
                stroke="currentColor"
                strokeWidth="1.3"
              />
            </svg>
            Explorer
          </span>
          <span className="font-mono text-xs text-(--tx-faint,#5C6976)">
            {files.length} files
          </span>
        </div>

        {/* Minimalist Search Box */}
        <div className="flex items-center gap-2 rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833)/80 px-3 py-1.5 text-xs">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            className="text-(--tx-faint,#5C6976)"
          >
            <path
              d="M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
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
      <div className="flex min-h-0 flex-1 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent] flex-col gap-3 overflow-y-auto p-3">
        {/* Folders header without any + Upload button */}
        <div className="px-1 font-mono text-[11px] font-semibold tracking-wider text-(--tx-faint,#5C6976) uppercase">
          <span>Folders</span>
        </div>

        <div className="flex flex-col gap-2.5">
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
                      isOpenInTab={openedFileIds.includes(file.id)}
                      onOpenFile={onOpenFile}
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
  )
}
