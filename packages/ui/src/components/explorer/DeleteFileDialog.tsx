import { useState } from "react"
import { FileText, LoaderCircle, Trash2 } from "lucide-react"

import { Button } from "../button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog"

interface DeleteFileDialogProps {
  open: boolean
  fileName: string
  onOpenChange: (open: boolean) => void
  onDelete: () => Promise<void> | void
}

export function DeleteFileDialog({
  open,
  fileName,
  onOpenChange,
  onDelete,
}: DeleteFileDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const handleDelete = async () => {
    setRequestError(null)
    setIsDeleting(true)

    try {
      await onDelete()
      onOpenChange(false)
    } catch {
      setRequestError("Couldn’t delete this file. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !isDeleting && onOpenChange(nextOpen)}
    >
      <DialogContent
        style={{ width: "min(28rem, calc(100vw - 2rem))" }}
        className="max-w-[calc(100vw-2rem)] min-w-0 gap-0 overflow-hidden border-(--line,#25313E) bg-(--bg-panel,#121A23) p-0 text-(--tx,#DCE3EA) shadow-2xl sm:max-w-md"
      >
        <DialogHeader className="max-w-full min-w-0 overflow-hidden border-b border-(--line-soft,#1B2530) px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Trash2 className="h-4 w-4 text-(--danger-tx,#F0A19D)" />
            Delete file permanently?
          </DialogTitle>
          <DialogDescription className="sr-only">
            Permanently delete {fileName}.
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

          <div className="max-w-full min-w-0 rounded-sm border border-(--danger,#E0625C)/30 bg-(--danger,#E0625C)/10 px-3 py-3 text-xs leading-5 break-words text-(--danger-tx,#F0A19D)">
            This file will disappear from its folder and any open tabs. Its
            original file and indexed data will also be permanently deleted.
            This action cannot be undone.
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
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? (
              <>
                <LoaderCircle className="animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 />
                Delete file
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
