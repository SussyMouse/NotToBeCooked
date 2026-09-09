import { useId, useState } from "react"
import { FilePenLine, LoaderCircle } from "lucide-react"

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

interface RenameFileDialogProps {
  open: boolean
  fileName: string
  onOpenChange: (open: boolean) => void
  onRename: (newFileName: string) => Promise<void> | void
}

function splitFileName(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf(".")

  if (lastDotIndex <= 0) {
    return {
      baseName: fileName,
      extension: "",
    }
  }

  return {
    baseName: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex),
  }
}

export function RenameFileDialog({
  open,
  fileName,
  onOpenChange,
  onRename,
}: RenameFileDialogProps) {
  const inputId = useId()
  const { baseName, extension } = splitFileName(fileName)

  const [name, setName] = useState(baseName)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const trimmedName = name.trim()
  const validationError =
    trimmedName.length === 0 ? "File name is required." : null

  const newFileName = `${trimmedName}${extension}`
  const hasChanged = newFileName !== fileName

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRequestError(null)

    if (!trimmedName || !hasChanged) return

    setIsSubmitting(true)

    try {
      await onRename(newFileName)
      onOpenChange(false)
    } catch {
      setRequestError("Couldn’t rename this file. Please try again.")
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
        <DialogHeader className="min-w-0 border-b border-(--line-soft,#1B2530) px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <FilePenLine className="h-4 w-4 text-(--acc,#52A8EA)" />
            Rename file
          </DialogTitle>

          <DialogDescription className="sr-only">
            Change the display name of {fileName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-w-0 overflow-hidden">
          <div className="flex min-w-0 flex-col gap-4 px-5 py-4">
            {requestError && (
              <div
                role="alert"
                className="rounded-sm border border-(--danger,#E0625C)/30 bg-(--danger,#E0625C)/10 px-3 py-2 text-xs text-(--danger-tx,#F0A19D)"
              >
                {requestError}
              </div>
            )}

            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex min-w-0 items-center justify-between gap-4">
                <label
                  htmlFor={inputId}
                  className="shrink-0 text-xs font-semibold text-(--tx,#DCE3EA)"
                >
                  File name
                </label>

                <span
                  title={`Original: ${fileName}`}
                  className="min-w-0 truncate font-mono text-[10px] text-(--tx-faint,#5C6976)"
                >
                  Original: {fileName}
                </span>
              </div>

              <div className="relative min-w-0">
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
                  className="h-10 max-w-full min-w-0 pr-16 text-sm"
                />

                {extension && (
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-(--tx-faint,#5C6976)">
                    {extension}
                  </span>
                )}
              </div>

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
                  Renaming preserves the file, indexing, and links.
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
              disabled={isSubmitting || trimmedName.length === 0 || !hasChanged}
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
