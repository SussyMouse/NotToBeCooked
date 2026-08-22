import { useState } from "react"
import { Upload, X, UploadCloud } from "lucide-react"

interface UploadModalProps {
  isOpen: boolean
  courseCode: string
  categories: string[]
  initialCategory?: string
  isDirectFolderUpload?: boolean
  onClose: () => void
  onUploadSuccess: (category: string, filename?: string) => void
}

export function UploadModal({
  isOpen,
  courseCode,
  categories,
  initialCategory,
  isDirectFolderUpload = false,
  onClose,
  onUploadSuccess,
}: UploadModalProps) {
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null)

  if (!isOpen) return null

  const selectedCategory =
    categoryOverride ?? initialCategory ?? categories[0] ?? "Lecture Decks"

  const handleClose = () => {
    setCategoryOverride(null)
    onClose()
  }

  const handleSimulatedUpload = () => {
    onUploadSuccess(selectedCategory)
    handleClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs fade-in"
      onClick={handleClose}
    >
      <div
        className="flex w-full max-w-md animate-in flex-col overflow-hidden rounded-xl border border-(--line,#25313E) bg-(--bg-panel,#121A23) shadow-2xl duration-150 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-(--line-soft,#1B2530) p-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-(--acc,#52A8EA)" />
            <h3 className="text-sm font-bold text-(--tx,#DCE3EA)">
              {isDirectFolderUpload
                ? `Upload to ${selectedCategory}`
                : `Upload Documents to ${courseCode}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-lg p-1 text-(--tx-faint,#5C6976) hover:bg-(--bg-raise,#1C2833) hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col gap-4 p-4 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] tracking-wider text-(--tx-faint,#5C6976) uppercase">
              Target Category Folder
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setCategoryOverride(e.target.value)}
              className="rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-3 py-2 text-xs text-(--tx,#DCE3EA) outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop Dropzone */}
          <div
            onClick={handleSimulatedUpload}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-(--line,#25313E) bg-(--bg-raise,#1C2833)/40 p-6 text-center transition-colors hover:border-(--acc,#52A8EA) hover:bg-(--bg-hover,#213040)/30"
          >
            <UploadCloud className="h-7 w-7 text-(--acc,#52A8EA)" />
            <span className="text-xs font-medium text-(--tx,#DCE3EA)">
              Click or drag files here to upload
            </span>
            <span className="font-mono text-[10px] text-(--tx-faint,#5C6976)">
              PDF, Markdown, DOCX up to 50MB · Automatic Vector Ingestion
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-(--line-soft,#1B2530) bg-(--bg-bar,#101821) p-3">
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-lg border border-(--line,#25313E) bg-transparent px-3 py-1.5 text-xs text-(--tx-dim,#8B98A7) hover:bg-(--bg-raise,#1C2833)"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSimulatedUpload}
            className="cursor-pointer rounded-lg bg-(--acc,#52A8EA) px-4 py-1.5 text-xs font-semibold text-(--bg-canvas,#161F29) hover:opacity-90"
          >
            Upload File
          </button>
        </div>
      </div>
    </div>
  )
}
