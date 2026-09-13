import { useId, useMemo, useState } from "react"
import { Check, Folder, LoaderCircle, MoveRight, Search } from "lucide-react"

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

interface MoveFileDialogProps {
  open: boolean
  fileName: string
  currentFolder: string
  folders: string[]
  onOpenChange: (open: boolean) => void
  onMove: (destinationFolder: string) => Promise<void> | void
}

export function MoveFileDialog({
  open,
  fileName,
  currentFolder,
  folders,
  onOpenChange,
  onMove,
}: MoveFileDialogProps) {
  const searchInputId = useId()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const filteredFolders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return folders

    return folders.filter((folder) => folder.toLowerCase().includes(query))
  }, [folders, searchQuery])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRequestError(null)

    if (!selectedFolder) return

    setIsSubmitting(true)

    try {
      await onMove(selectedFolder)
      onOpenChange(false)
    } catch {
      setRequestError("Couldn’t move this file. Please try again.")
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
            <MoveRight className="h-4 w-4 text-(--acc,#52A8EA)" />
            Move file
          </DialogTitle>

          <DialogDescription className="sr-only">
            Move {fileName} to another folder in the current course.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-w-0 overflow-hidden">
          <div className="flex min-w-0 flex-col gap-4 px-5 py-4">
            <div className="rounded-sm border border-(--line-soft,#1B2530) bg-(--bg-raise,#1C2833)/60 p-3">
              <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
                <dt className="text-(--tx-faint,#5C6976)">File</dt>
                <dd
                  title={fileName}
                  className="truncate text-right font-medium text-(--tx,#DCE3EA)"
                >
                  {fileName}
                </dd>

                <dt className="text-(--tx-faint,#5C6976)">Current folder</dt>
                <dd
                  title={currentFolder}
                  className="truncate text-right text-(--tx-dim,#8B98A7)"
                >
                  {currentFolder}
                </dd>
              </dl>
            </div>

            {requestError && (
              <div
                role="alert"
                className="rounded-sm border border-(--danger,#E0625C)/30 bg-(--danger,#E0625C)/10 px-3 py-2 text-xs text-(--danger-tx,#F0A19D)"
              >
                {requestError}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor={searchInputId}
                className="text-xs font-semibold text-(--tx,#DCE3EA)"
              >
                Choose destination folder
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--tx-faint,#5C6976)" />

                <Input
                  id={searchInputId}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search folders…"
                  disabled={isSubmitting}
                  className="h-10 pl-9 text-sm"
                />
              </div>
            </div>

            <div
              role="radiogroup"
              aria-label="Destination folder"
              className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-sm border border-(--line-soft,#1B2530) p-1"
            >
              {filteredFolders.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <Folder className="mx-auto mb-2 h-5 w-5 text-(--tx-faint,#5C6976)" />
                  <p className="text-xs text-(--tx-dim,#8B98A7)">
                    No folders found.
                  </p>
                </div>
              ) : (
                filteredFolders.map((folder) => {
                  const isCurrent = folder === currentFolder
                  const isSelected = folder === selectedFolder

                  return (
                    <button
                      key={folder}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={isCurrent || isSubmitting}
                      onClick={() => {
                        setSelectedFolder(folder)
                        setRequestError(null)
                      }}
                      className={`flex h-10 w-full items-center gap-2 rounded-sm px-3 text-left text-xs transition-colors focus-visible:ring-2 focus-visible:ring-(--acc,#52A8EA) focus-visible:outline-none ${
                        isSelected
                          ? "bg-(--acc,#52A8EA)/15 text-(--acc,#52A8EA)"
                          : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040)/60 hover:text-(--tx,#DCE3EA)"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <Folder className="h-4 w-4 shrink-0" />

                      <span className="min-w-0 flex-1 truncate">{folder}</span>

                      {isCurrent && (
                        <span className="font-mono text-[9px] tracking-wide text-(--tx-faint,#5C6976)">
                          CURRENT
                        </span>
                      )}

                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>

            <div className="flex min-h-5 min-w-0 items-center justify-between gap-4 text-xs">
              <span className="text-(--tx-faint,#5C6976)">Destination</span>

              <span
                title={selectedFolder ?? undefined}
                className="min-w-0 truncate font-medium text-(--acc,#52A8EA)"
              >
                {selectedFolder ?? "No folder selected"}
              </span>
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
              disabled={!selectedFolder || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Moving…
                </>
              ) : (
                "Move"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
