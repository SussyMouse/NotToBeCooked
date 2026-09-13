import type { FileStatus } from "../../types/course"

interface FileStatusBadgeProps {
  status: FileStatus
}

const STATUS_CONFIG: Record<
  FileStatus,
  {
    label: string
    className: string
  }
> = {
  uploaded: {
    label: "UPLOADED",
    className: "border-border bg-muted text-muted-foreground",
  },
  processing: {
    label: "INDEXING",
    className: "border-blue-500/20 bg-blue-500/10 text-blue-500",
  },
  ready: {
    label: "READY",
    className:
      "border-(--ok,#4FB07C)/25 bg-(--ok,#4FB07C)/10 text-(--ok,#4FB07C)",
  },
  failed: {
    label: "FAILED",
    className:
      "border-(--danger,#E0625C)/25 bg-(--danger,#E0625C)/10 text-(--danger-tx,#F0A19D)",
  },
}

export function FileStatusBadge({
  status,
}: FileStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center rounded border px-1.5 font-mono text-[10px] font-semibold tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  )
}