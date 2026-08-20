/**
 * Mention Resolution Utility
 *
 * Parses @[Filename] and @[Category] tags from chat prompt text, extracts
 * the clean question text, and resolves mentioned file names or categories
 * into concrete file IDs for RAG query scoping.
 */

export interface FileItem {
  id: string
  name: string
  category?: string
}

export interface ExtractMentionsResult {
  /** Prompt question stripped of @-mention tags and extra surrounding whitespace */
  cleanQuestion: string
  /** Array of resolved file IDs matching mentions, or null if no mentions were specified */
  fileIds: string[] | null
  /** Raw extracted mention label strings (e.g. ["Lecture 4.pdf", "Lab Handouts"]) */
  mentionedLabels: string[]
}

/**
 * Regex to match both atomic mention tags `@[Name]` and inline `@Word` mentions.
 */
const MENTION_REGEX = /(@\[([^\]]+)\]|@([a-zA-Z0-9_\-.]+))/g

/**
 * Extract raw mention label strings from prompt text and compute clean question.
 *
 * Implements Option B: Converts mention syntax like `@[Lecture 1 - SOLID.pdf]`
 * to clean natural title text `"Lecture 1 - SOLID"` (stripping `@`, `[]`, and
 * file extensions) so that semantic vector search preserves substantive nouns
 * and topic keywords without query syntax noise.
 */
export function parseMentions(promptText: string): {
  cleanQuestion: string
  mentionedLabels: string[]
} {
  if (!promptText) {
    return { cleanQuestion: "", mentionedLabels: [] }
  }

  const labels: string[] = []

  // Replace each mention tag with a clean human-readable title
  const cleanQuestion = promptText
    .replace(MENTION_REGEX, (_fullMatch, _atomic, atomicName, inlineWord) => {
      const rawName = (atomicName || inlineWord || "").trim()
      if (rawName) {
        labels.push(rawName)
        // Clean out file extension (e.g. "Lecture 1.pdf" -> "Lecture 1")
        const naturalTitle = rawName
          .replace(/\.(pdf|docx?|pptx?|txt|md)$/i, "")
          .trim()
        return naturalTitle
      }
      return ""
    })
    .replace(/\s+/g, " ")
    .trim()

  return {
    cleanQuestion: cleanQuestion || promptText.trim(),
    mentionedLabels: Array.from(new Set(labels)),
  }
}

/**
 * Resolve mention labels (filenames or categories) to matching file IDs.
 *
 * Matching Priority:
 * 1. Exact ID or exact filename match (case-insensitive)
 * 2. Category match (returns all files belonging to that category)
 * 3. Substring match on filename (case-insensitive)
 */
export function resolveMentionFileIds(
  mentionLabels: string[],
  availableFiles: FileItem[]
): string[] {
  if (!mentionLabels.length || !availableFiles.length) {
    return []
  }

  const matchedFileIds = new Set<string>()

  for (const label of mentionLabels) {
    const lowerLabel = label.toLowerCase()

    // 1. Direct match on file ID
    const directIdMatch = availableFiles.find((f) => f.id === label)
    if (directIdMatch) {
      matchedFileIds.add(directIdMatch.id)
      continue
    }

    // 2. Exact filename match (case-insensitive)
    const exactNameMatches = availableFiles.filter(
      (f) => f.name.toLowerCase() === lowerLabel
    )
    if (exactNameMatches.length > 0) {
      exactNameMatches.forEach((f) => matchedFileIds.add(f.id))
      continue
    }

    // 3. Category match (case-insensitive)
    const categoryMatches = availableFiles.filter(
      (f) => f.category && f.category.toLowerCase() === lowerLabel
    )
    if (categoryMatches.length > 0) {
      categoryMatches.forEach((f) => matchedFileIds.add(f.id))
      continue
    }

    // 4. Substring / partial filename match
    const partialMatches = availableFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(lowerLabel) ||
        lowerLabel.includes(f.name.toLowerCase())
    )
    if (partialMatches.length > 0) {
      partialMatches.forEach((f) => matchedFileIds.add(f.id))
    }
  }

  return Array.from(matchedFileIds)
}

/**
 * High-level helper combining mention parsing and file ID resolution.
 */
export function extractMentionsAndResolve(
  promptText: string,
  availableFiles: FileItem[]
): ExtractMentionsResult {
  const { cleanQuestion, mentionedLabels } = parseMentions(promptText)
  const resolvedIds = resolveMentionFileIds(mentionedLabels, availableFiles)

  return {
    cleanQuestion,
    fileIds: resolvedIds.length > 0 ? resolvedIds : null,
    mentionedLabels,
  }
}
