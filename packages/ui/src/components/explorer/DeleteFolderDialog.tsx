import { useState } from "react"
import { AlertTriangle, Folder, LoaderCircle, Trash2 } from "lucide-react"

import { Button } from "../button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog"

interface DeleteFolderDialogProps {
  open: boolean
  folderName: string
  fileCount: number
  childFolderCount: number
  onOpenChange: (open: boolean) => void
  onDelete: () => Promise<void> | void
}

export function DeleteFolderDialog({
  open,
  folderName,
  fileCount,
  childFolderCount,
  onOpenChange,
  onDelete,
}: DeleteFolderDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const isBlocked = fileCount > 0 || childFolderCount > 0

  const handleDelete = async () => {
    if (isBlocked) return
    setRequestError(null)
    setIsDeleting(true)
    try {
      await onDelete()
      onOpenChange(false)
    } catch {
      setRequestError("Couldn’t delete this folder. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !isDeleting && onOpenChange(nextOpen)}
    >
      <DialogContent className="min-w-0 gap-0 overflow-hidden border-(--line,#25313E) bg-(--bg-panel,#121A23) p-0 text-(--tx,#DCE3EA) shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-(--line-soft,#1B2530) px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            {isBlocked ? (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            ) : (
              <Trash2 className="h-4 w-4 text-(--danger-tx,#F0A19D)" />
            )}
            {isBlocked ? "Folder can’t be deleted" : "Delete folder?"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isBlocked
              ? `${folderName} must be empty before it can be deleted.`
              : `Permanently delete the empty folder ${folderName}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="rounded-sm border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833)/60 px-3 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Folder className="h-4 w-4 shrink-0 text-(--acc,#52A8EA)" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {folderName}
              </span>
            </div>
            <p className="mt-2 font-mono text-[10px] text-(--tx-dim,#8B98A7)">
              {fileCount} {fileCount === 1 ? "file" : "files"} ·{" "}
              {childFolderCount}{" "}
              {childFolderCount === 1 ? "subfolder" : "subfolders"}
            </p>
          </div>

          {requestError && (
            <div
              role="alert"
              className="rounded-sm border border-(--danger,#E0625C)/30 bg-(--danger,#E0625C)/10 px-3 py-2 text-xs text-(--danger-tx,#F0A19D)"
            >
              {requestError}
            </div>
          )}

          <div
            className={`rounded-sm border px-3 py-3 text-xs leading-5 ${isBlocked ? "border-amber-400/30 bg-amber-400/10 text-amber-200" : "border-(--danger,#E0625C)/30 bg-(--danger,#E0625C)/10 text-(--danger-tx,#F0A19D)"}`}
          >
            {isBlocked
              ? "Move or remove this folder’s files and subfolders before deleting it."
              : "This empty folder will be permanently deleted. This action cannot be undone."}
          </div>
        </div>

        <DialogFooter className="border-t border-(--line-soft,#1B2530) px-5 py-3">
          {isBlocked ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          ) : (
            <>
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
                    Delete folder
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
