import { useId, useState } from "react"
import { FolderPlus, LoaderCircle } from "lucide-react"

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

interface CreateFolderDialogProps {
  open: boolean
  parentFolder?: string
  onOpenChange: (open: boolean) => void
  onCreate: (folderName: string) => Promise<void> | void
}

export function CreateFolderDialog({
  open,
  parentFolder,
  onOpenChange,
  onCreate,
}: CreateFolderDialogProps) {
  const inputId = useId()
  const [name, setName] = useState("")
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const trimmedName = name.trim()
  const validationError =
    hasSubmitted && trimmedName.length === 0 ? "Folder name is required." : null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasSubmitted(true)
    setRequestError(null)

    if (!trimmedName) return

    setIsSubmitting(true)

    try {
      await onCreate(trimmedName)
      onOpenChange(false)
    } catch {
      setRequestError("Couldn’t create this folder. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          onOpenChange(nextOpen)
        }
      }}
    >
      <DialogContent className="min-w-0 gap-0 overflow-hidden border-(--line,#25313E) bg-(--bg-panel,#121A23) p-0 text-(--tx,#DCE3EA) shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-(--line-soft,#1B2530) px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <FolderPlus className="h-4 w-4 text-(--acc,#52A8EA)" />
            {parentFolder ? "New subfolder" : "New folder"}
          </DialogTitle>

          <DialogDescription className="sr-only">
            {parentFolder
              ? `Create a new folder inside ${parentFolder}.`
              : "Create a new top-level folder."}
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

            <div className="rounded-sm border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833)/60 px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-(--tx-dim,#8B98A7)">Create inside</span>

                <span
                  title={parentFolder ?? "Course root"}
                  className="min-w-0 truncate font-medium text-(--tx,#DCE3EA)"
                >
                  {parentFolder ?? "Course root"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={inputId}
                className="text-xs font-semibold text-(--tx,#DCE3EA)"
              >
                Folder name
              </label>

              <Input
                id={inputId}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setHasSubmitted(false)
                  setRequestError(null)
                }}
                autoFocus
                disabled={isSubmitting}
                placeholder="e.g. Week 3"
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
                  Use a clear name for your study materials.
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
              disabled={isSubmitting || trimmedName.length === 0}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <FolderPlus />
                  Create subfolder
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
