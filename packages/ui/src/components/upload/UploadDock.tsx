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
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        className="text-(--acc,#52A8EA)"
      >
        <path
          d="M8 11V3M8 3L5 6M8 3l3 3M3 11v1.5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Upload Files</span>
    </button>
  )
}
