import { useId, useState } from "react"
import { FolderPen, LoaderCircle } from "lucide-react"

import { Button } from "../button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog"
import { Input } from "../input"

interface RenameFolderDialogProps {
  open: boolean
  folderName: string
  onOpenChange: (open: boolean) => void
  onRename: (newFolderName: string) => Promise<void> | void
}

export function RenameFolderDialog({
  open,
  folderName,
  onOpenChange,
  onRename,
}: RenameFolderDialogProps) {
  const inputId = useId()
  const [name, setName] = useState(folderName)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const trimmedName = name.trim()
  const validationError = trimmedName ? null : "Folder name is required."
  const hasChanged = trimmedName !== folderName

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRequestError(null)
    if (validationError || !hasChanged) return

    setIsSubmitting(true)
    try {
      await onRename(trimmedName)
      onOpenChange(false)
    } catch {
      setRequestError("Couldn’t rename this folder. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="min-w-0 gap-0 overflow-hidden border-(--line,#25313E) bg-(--bg-panel,#121A23) p-0 text-(--tx,#DCE3EA) shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-(--line-soft,#1B2530) px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <FolderPen className="h-4 w-4 text-(--acc,#52A8EA)" />
            Rename folder
          </DialogTitle>
          <DialogDescription className="sr-only">
            Rename {folderName} without changing its files or subfolders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 px-5 py-4">
            {requestError && (
              <div
                role="alert"
                className="rounded-sm border border-(--danger,#E0625C)/30 bg-(--danger,#E0625C)/10 px-3 py-2 text-xs text-(--danger-tx,#F0A19D)"
              >
                {requestError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex min-w-0 items-center justify-between gap-4">
                <label
                  htmlFor={inputId}
                  className="shrink-0 text-xs font-semibold"
                >
                  Folder name
                </label>
                <span
                  title={`Original: ${folderName}`}
                  className="min-w-0 truncate font-mono text-[10px] text-(--tx-faint,#5C6976)"
                >
                  Original: {folderName}
                </span>
              </div>

              <Input
                id={inputId}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setRequestError(null)
                }}
                autoFocus
                disabled={isSubmitting}
                aria-invalid={Boolean(validationError)}
                aria-describedby={
                  validationError ? `${inputId}-error` : `${inputId}-help`
                }
                className="h-10 text-sm"
              />

              {validationError ? (
                <p
                  id={`${inputId}-error`}
                  className="text-xs text-(--danger-tx,#F0A19D)"
                >
                  {validationError}
                </p>
              ) : (
                <p
                  id={`${inputId}-help`}
                  className="text-xs text-(--tx-faint,#5C6976)"
                >
                  Renaming preserves this folder’s files and subfolders.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-(--line-soft,#1B2530) px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || Boolean(validationError) || !hasChanged}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Renaming…
                </>
              ) : (
                "Rename"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
