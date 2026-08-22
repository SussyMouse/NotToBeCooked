import { Upload } from "lucide-react"

interface UploadDockProps {
  onOpenBatchUpload: () => void
}

export function UploadDock({ onOpenBatchUpload }: UploadDockProps) {
  return (
    <button
      type="button"
      onClick={onOpenBatchUpload}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-3 py-2 text-xs font-medium text-(--tx,#DCE3EA) shadow-xs transition-all hover:border-(--acc,#52A8EA)/50 hover:bg-(--bg-hover,#213040) hover:text-white active:scale-98"
    >
      <Upload className="h-3.5 w-3.5 text-(--acc,#52A8EA)" />
      <span>Upload Files</span>
    </button>
  )
}
