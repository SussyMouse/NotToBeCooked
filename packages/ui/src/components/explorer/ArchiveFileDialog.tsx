import { useState } from "react"
import { Archive, FileText, LoaderCircle } from "lucide-react"

import { Button } from "../button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog"

interface ArchiveFileDialogProps {
  open: boolean
  fileName: string
  onOpenChange: (open: boolean) => void
  onArchive: () => Promise<void> | void
}

export function ArchiveFileDialog({
  open,
  fileName,
  onOpenChange,
  onArchive,
}: ArchiveFileDialogProps) {
  const [isArchiving, setIsArchiving] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const handleArchive = async () => {
    setRequestError(null)
    setIsArchiving(true)

    try {
      await onArchive()
      onOpenChange(false)
    } catch {
      setRequestError("Couldn’t archive this file. Please try again.")
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !isArchiving && onOpenChange(nextOpen)}
    >
      <DialogContent
        style={{ width: "min(28rem, calc(100vw - 2rem))" }}
        className="max-w-[calc(100vw-2rem)] min-w-0 gap-0 overflow-hidden border-(--line,#25313E) bg-(--bg-panel,#121A23) p-0 text-(--tx,#DCE3EA) shadow-2xl sm:max-w-md"
      >
        <DialogHeader className="max-w-full min-w-0 overflow-hidden border-b border-(--line-soft,#1B2530) px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Archive className="h-4 w-4 text-amber-300" />
            Move file to archive?
          </DialogTitle>
          <DialogDescription className="sr-only">
            Archive {fileName} and hide it from the normal file browser.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-w-full min-w-0 flex-col gap-4 overflow-hidden px-5 py-4">
          <div className="grid w-full max-w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-sm border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833)/60 px-3 py-3">
            <FileText className="h-5 w-5 shrink-0 text-(--acc,#52A8EA)" />
            <span
              className="block min-w-0 flex-1 truncate text-sm font-semibold"
              title={fileName}
            >
              {fileName}
            </span>
          </div>

          <div className="max-w-full min-w-0 rounded-sm border border-amber-400/30 bg-amber-400/10 px-3 py-3 text-xs leading-5 break-words text-amber-100">
            This file will disappear from its folder and any open tabs. Its
            original content will be kept and can be restored from Archive
            later.
          </div>

          {requestError && (
            <div
              role="alert"
              className="rounded-sm border border-(--danger,#E0625C)/30 bg-(--danger,#E0625C)/10 px-3 py-2 text-xs text-(--danger-tx,#F0A19D)"
            >
              {requestError}
            </div>
          )}
        </div>

        <DialogFooter className="grid max-w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-t border-(--line-soft,#1B2530) px-5 py-3 sm:flex sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isArchiving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isArchiving}
            onClick={handleArchive}
          >
            {isArchiving ? (
              <>
                <LoaderCircle className="animate-spin" />
                Archiving…
              </>
            ) : (
              <>
                <Archive />
                Archive file
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
