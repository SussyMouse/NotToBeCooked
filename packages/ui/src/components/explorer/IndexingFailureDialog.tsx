import { useState } from "react"
import { AlertCircle, FileWarning, LoaderCircle, RotateCcw } from "lucide-react"

import { Button } from "../button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog"

interface IndexingFailureDialogProps {
  open: boolean
  fileName: string
  fileSize: string
  errorMessage?: string | null
  onOpenChange: (open: boolean) => void
  onRetry: () => Promise<void> | void
}

export function IndexingFailureDialog({
  open,
  fileName,
  fileSize,
  errorMessage,
  onOpenChange,
  onRetry,
}: IndexingFailureDialogProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const handleRetry = async () => {
    setRequestError(null)
    setIsRetrying(true)

    try {
      await onRetry()
      onOpenChange(false)
    } catch {
      setRequestError(
        "Couldn’t start a new indexing request. Please try again."
      )
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !isRetrying && onOpenChange(nextOpen)}
    >
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md min-w-0 gap-0 overflow-hidden border-(--line,#25313E) bg-(--bg-panel,#121A23) p-0 text-(--tx,#DCE3EA) shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-(--line-soft,#1B2530) px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-4 w-4 text-(--danger-tx,#F0A19D)" />
            AI indexing failed
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review why {fileName} could not be indexed and retry the request.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-5 py-4">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-sm border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833)/60 px-3 py-3">
            <FileWarning className="h-5 w-5 shrink-0 text-(--danger-tx,#F0A19D)" />
            <div className="min-w-0 flex-1">
              <p className="block max-w-full truncate text-sm font-semibold">
                {fileName}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-(--tx-faint,#5C6976)">
                {fileSize} · Original file is still available
              </p>
            </div>
            <span className="rounded border border-(--danger,#E0625C)/25 bg-(--danger,#E0625C)/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-(--danger-tx,#F0A19D)">
              FAILED
            </span>
          </div>

          <div
            role="alert"
            className="rounded-sm border border-(--danger,#E0625C)/30 bg-(--danger,#E0625C)/10 px-3 py-3"
          >
            <p className="text-xs font-semibold text-(--danger-tx,#F0A19D)">
              {errorMessage || "The document could not be indexed."}
            </p>
            <p className="mt-1 text-xs leading-5 break-words whitespace-normal text-(--tx-dim,#8B98A7)">
              You can still open and read the original file. Chat and AI search
              will not use it until indexing succeeds.
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
        </div>

        <DialogFooter className="grid min-w-0 grid-cols-2 border-t border-(--line-soft,#1B2530) px-5 py-3 sm:grid-cols-[auto_auto] sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={isRetrying}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            className="w-full whitespace-nowrap sm:w-auto"
            disabled={isRetrying}
            onClick={handleRetry}
          >
            {isRetrying ? (
              <>
                <LoaderCircle className="animate-spin" />
                Retrying…
              </>
            ) : (
              <>
                <RotateCcw />
                Retry indexing
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
