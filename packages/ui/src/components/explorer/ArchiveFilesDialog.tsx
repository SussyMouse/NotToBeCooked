import { Archive, FileText, RotateCcw } from "lucide-react"

import type { MockDocumentFile } from "../../types/course"
import { Button } from "../button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../dialog"

interface ArchiveFilesDialogProps {
  open: boolean
  files: MockDocumentFile[]
  onOpenChange: (open: boolean) => void
  onRestore: (fileId: string) => Promise<void> | void
}

export function ArchiveFilesDialog({
  open,
  files,
  onOpenChange,
  onRestore,
}: ArchiveFilesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ width: "min(36rem, calc(100vw - 2rem))" }}
        className="max-w-[calc(100vw-2rem)] min-w-0 gap-0 overflow-hidden border-(--line,#25313E) bg-(--bg-panel,#121A23) p-0 text-(--tx,#DCE3EA) shadow-2xl"
      >
        <DialogHeader className="min-w-0 border-b border-(--line-soft,#1B2530) px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Archive className="h-4 w-4 text-amber-300" />
            Archived files
            <span className="rounded-sm bg-(--bg-raise,#1C2833) px-1.5 py-0.5 font-mono text-[10px] text-(--tx-dim,#8B98A7)">
              {files.length}
            </span>
          </DialogTitle>
          <DialogDescription className="text-left text-xs text-(--tx-dim,#8B98A7)">
            Archived files are hidden from the normal Explorer and AI search.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] min-h-44 min-w-0 overflow-y-auto p-4">
          {files.length === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-sm border border-(--line,#25313E) bg-(--bg-raise,#1C2833)">
                <Archive className="h-5 w-5 text-(--tx-faint,#5C6976)" />
              </div>
              <p className="text-sm font-semibold">Archive is empty</p>
              <p className="mt-1 text-xs text-(--tx-dim,#8B98A7)">
                Files you archive will appear here.
              </p>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833)/60 p-3"
                >
                  <FileText className="h-5 w-5 text-(--acc,#52A8EA)" />
                  <div className="min-w-0">
                    <p
                      className="truncate text-xs font-semibold"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="mt-1 truncate font-mono text-[10px] text-(--tx-faint,#5C6976)">
                      {file.category ?? "Uncategorized"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRestore(file.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
