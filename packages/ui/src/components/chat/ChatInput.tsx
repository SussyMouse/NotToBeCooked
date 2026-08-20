import React, { useState, useRef } from "react"

export interface ChatFile {
  id: string
  name: string
  category?: string
}

export interface ChatInputProps {
  files?: ChatFile[]
  categories?: string[]
  quickPrompts?: string[]
  isTyping?: boolean
  disabled?: boolean
  placeholder?: string
  onSend: (text: string) => void
  className?: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function createMentionBadgeElement(name: string): HTMLElement {
  const isPdf =
    name.toLowerCase().endsWith(".pdf") ||
    name.toLowerCase().includes("doc") ||
    name.toLowerCase().includes("pdf")

  const span = document.createElement("span")
  span.contentEditable = "false"
  span.dataset.mention = `@[${name}]`
  span.className =
    "inline-flex items-center gap-1 text-(--acc,#52A8EA) font-medium mx-0.5 select-none cursor-default"

  const iconSvg = isPdf
    ? `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" class="shrink-0 text-(--acc,#52A8EA) inline-block align-sub"><path d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-6.5L9.5 2h-6z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 2v4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" class="shrink-0 text-(--acc,#52A8EA) inline-block align-sub"><path d="M2 4a1 1 0 011-1h3.5L8 4.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`

  span.innerHTML = `${iconSvg}<span>${escapeHtml(name)}</span>`
  return span
}

export function getQueryFromEditor(editor: HTMLDivElement | null): string {
  if (!editor) return ""
  let result = ""

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.nodeValue || ""
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.dataset.mention) {
        result += el.dataset.mention
      } else if (el.tagName === "BR") {
        result += "\n"
      } else {
        for (let i = 0; i < el.childNodes.length; i++) {
          walk(el.childNodes[i])
        }
      }
    }
  }

  for (let i = 0; i < editor.childNodes.length; i++) {
    walk(editor.childNodes[i])
  }
  return result
}

export const ChatInput: React.FC<ChatInputProps> = ({
  files = [],
  categories = [],
  quickPrompts = [],
  isTyping = false,
  disabled = false,
  placeholder = "Ask a question or type @ to scope files...",
  onSend,
  className = "",
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [atOpen, setAtOpen] = useState(false)
  const [atFilter, setAtFilter] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(atFilter.toLowerCase())
  )
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(atFilter.toLowerCase())
  )

  const totalFilteredCount = filteredCategories.length + filteredFiles.length

  const handleEditorInput = () => {
    const editor = editorRef.current
    if (!editor) return

    const query = getQueryFromEditor(editor)
    setIsEmpty(query.trim() === "")

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    const range = sel.getRangeAt(0)
    const node = range.startContainer

    if (node.nodeType === Node.TEXT_NODE) {
      const textBeforeCursor = (node.nodeValue || "").slice(
        0,
        range.startOffset
      )
      const match = textBeforeCursor.match(/@([^\s@]*)$/)
      if (match) {
        setAtOpen(true)
        setAtFilter(match[1] || "")
        setSelectedIndex(0)
        return
      }
    }
    setAtOpen(false)
    setAtFilter("")
    setSelectedIndex(0)
  }

  const insertMention = (name: string) => {
    const editor = editorRef.current
    if (!editor) return

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    const range = sel.getRangeAt(0)
    const node = range.startContainer

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue || ""
      const offset = range.startOffset
      const textBefore = text.slice(0, offset)
      const textAfter = text.slice(offset)

      const match = textBefore.match(/@([^\s@]*)$/)
      if (match) {
        const atIndex = match.index!
        const cleanBefore = textBefore.slice(0, atIndex)

        node.nodeValue = cleanBefore

        const badge = createMentionBadgeElement(name)
        const spaceNode = document.createTextNode("\u00A0")

        const parent = node.parentNode!
        const next = node.nextSibling

        parent.insertBefore(badge, next)
        parent.insertBefore(spaceNode, badge.nextSibling)

        if (textAfter) {
          const afterNode = document.createTextNode(textAfter)
          parent.insertBefore(afterNode, spaceNode.nextSibling)
        }

        const newRange = document.createRange()
        newRange.setStartAfter(spaceNode)
        newRange.setEndAfter(spaceNode)
        sel.removeAllRanges()
        sel.addRange(newRange)
      }
    }

    setAtOpen(false)
    setAtFilter("")
    setIsEmpty(false)
    editor.focus()
  }

  const handleSelectMentionByIndex = (index: number) => {
    if (index < filteredCategories.length) {
      insertMention(filteredCategories[index])
    } else {
      const fileIndex = index - filteredCategories.length
      if (filteredFiles[fileIndex]) {
        insertMention(filteredFiles[fileIndex].name)
      }
    }
  }

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (atOpen && totalFilteredCount > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % totalFilteredCount)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex(
          (prev) => (prev - 1 + totalFilteredCount) % totalFilteredCount
        )
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        handleSelectMentionByIndex(selectedIndex)
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setAtOpen(false)
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey && !isTyping && !disabled) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = (overrideText?: string) => {
    if (isTyping || disabled) return

    const textToSend = (
      overrideText !== undefined
        ? overrideText
        : getQueryFromEditor(editorRef.current)
    ).trim()

    if (!textToSend) return

    if (overrideText === undefined && editorRef.current) {
      editorRef.current.innerHTML = ""
      setIsEmpty(true)
    }
    setAtOpen(false)
    onSend(textToSend)
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Quick Suggestions Row */}
      {quickPrompts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 px-1">
          <span className="mr-1 font-mono text-[9.5px] tracking-wider text-(--tx-faint,#5C6976) uppercase">
            Try
          </span>
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isTyping || disabled}
              onClick={() => handleSubmit(q)}
              className="cursor-pointer rounded-full border border-(--line,#25313E) bg-(--bg-raise,#1C2833) px-2.5 py-0.5 text-[11px] text-(--tx-dim,#8B98A7) [outline:none] transition-colors outline-none hover:bg-(--bg-hover,#213040) hover:text-(--tx,#DCE3EA) focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative">
        {/* @ Mention Picker Dropdown */}
        {atOpen && (
          <div className="absolute right-0 bottom-[calc(100%+6px)] left-0 z-30 overflow-hidden rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) shadow-xl">
            <div className="flex items-center justify-between border-b border-(--line-soft,#1B2530) px-3 py-1.5 font-mono text-[9.5px] tracking-wider text-(--tx-faint,#5C6976) uppercase">
              <span>Scope to file or folder</span>
              <span className="text-[9px]">
                ↑↓ to navigate · Enter to select
              </span>
            </div>
            <div className="max-h-48 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent] overflow-y-auto p-1">
              {filteredCategories.map((cat, idx) => {
                const isSelected = selectedIndex === idx
                return (
                  <div
                    key={`cat-${idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      insertMention(cat)
                    }}
                    className={`flex cursor-pointer items-center gap-2 rounded p-1.5 transition-colors ${
                      isSelected
                        ? "bg-(--bg-hover,#213040) text-(--tx,#DCE3EA)"
                        : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040)"
                    }`}
                  >
                    <span className="text-(--tx-faint,#5C6976)">📁</span>
                    <span className="text-xs font-medium">{cat}</span>
                    <span className="ml-auto font-mono text-[9.5px] text-(--tx-faint,#5C6976)">
                      Category
                    </span>
                  </div>
                )
              })}
              {filteredFiles.map((file, idx) => {
                const itemIndex = filteredCategories.length + idx
                const isSelected = selectedIndex === itemIndex
                return (
                  <div
                    key={`file-${idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      insertMention(file.name)
                    }}
                    className={`flex cursor-pointer items-center gap-2 rounded p-1.5 transition-colors ${
                      isSelected
                        ? "bg-(--bg-hover,#213040) text-(--tx,#DCE3EA)"
                        : "text-(--tx-dim,#8B98A7) hover:bg-(--bg-hover,#213040)"
                    }`}
                  >
                    <span className="text-(--tx-faint,#5C6976)">📄</span>
                    <span className="truncate text-xs">{file.name}</span>
                    <span className="ml-auto shrink-0 font-mono text-[9.5px] text-(--tx-faint,#5C6976)">
                      {file.category || "File"}
                    </span>
                  </div>
                )
              })}
              {filteredCategories.length === 0 &&
                filteredFiles.length === 0 && (
                  <div className="p-3 text-center text-xs text-(--tx-faint,#5C6976)">
                    No matching files or categories
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Input Box with Send Button */}
        <div className="relative flex items-end gap-2 rounded-lg border border-(--line,#25313E) bg-(--bg-raise,#1C2833) p-2 transition-colors focus-within:border-(--acc-deep,#1D5D8A)">
          <div className="relative min-w-0 flex-1">
            {isEmpty && (
              <div className="pointer-events-none absolute top-0.5 left-0 text-[13.5px] text-(--tx-faint,#5C6976) select-none">
                {isTyping ? "Assistant is thinking…" : placeholder}
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable={!isTyping && !disabled}
              onInput={handleEditorInput}
              onKeyDown={handleEditorKeyDown}
              onKeyUp={handleEditorInput}
              className="max-h-36 min-h-6 scrollbar-thin [scrollbar-color:var(--line,#25313E)_transparent] overflow-y-auto py-0.5 text-[13.5px] leading-relaxed wrap-break-word whitespace-pre-wrap text-(--tx,#DCE3EA) [outline:none] outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isTyping || isEmpty || disabled}
            title="Send Message"
            className="mb-0.5 flex h-6.5 w-6.5 flex-none cursor-pointer items-center justify-center rounded bg-(--acc-deep,#1D5D8A) text-(--on-acc,#EAF5FD) transition-colors hover:bg-(--acc-deep-h,#246C9E) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-(--acc-deep,#1D5D8A)"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M1.8 7h9.4M7.4 3.2L11.2 7l-3.8 3.8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatInput
