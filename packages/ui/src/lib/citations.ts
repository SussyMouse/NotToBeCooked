export interface CitationItem {
  marker?: number
  f: string // file id
  p: number // page
  b?: string // block id / chunk id
  l: string // display label e.g. "Lecture 4 · p.1"
  quote?: string // primary verbatim quote
  quotes?: string[] // all quotes for this marker (Decision 4 Option A)
}

/**
 * Decision 4 Option A: Render every entry that carries that marker.
 * Groups raw citations by marker into one pill carrying several quoted lines.
 */
export function groupCitations(
  rawCitations?: Array<Record<string, unknown>> | null,
  lookupFilename?: (fileId: string) => string | undefined
): CitationItem[] {
  if (!rawCitations || !Array.isArray(rawCitations) || rawCitations.length === 0) {
    return []
  }

  const markerMap = new Map<number | string, CitationItem>()

  for (const raw of rawCitations) {
    const marker = typeof raw.marker === "number" ? raw.marker : undefined
    const fileIdStr = String(raw.file_id ?? raw.f ?? "")
    const pageNum = Number(raw.page ?? raw.page_start ?? raw.p ?? 1)
    const quote = typeof raw.quote === "string" ? raw.quote.trim() : undefined
    const key = marker !== undefined ? marker : `${fileIdStr}:${pageNum}`

    let existing = markerMap.get(key)
    if (!existing) {
      const resolvedName =
        typeof raw.filename === "string" && raw.filename.length > 0
          ? raw.filename
          : (lookupFilename ? lookupFilename(fileIdStr) : undefined) || "Document"

      const label =
        typeof raw.l === "string" && raw.l.length > 0
          ? raw.l
          : `${resolvedName} · p.${pageNum}`

      existing = {
        marker,
        f: fileIdStr,
        p: pageNum,
        b: typeof raw.b === "string" ? raw.b : undefined,
        l: label,
        quote: quote,
        quotes: quote ? [quote] : [],
      }
      markerMap.set(key, existing)
    } else {
      if (quote && (!existing.quotes || !existing.quotes.includes(quote))) {
        existing.quotes = existing.quotes ? [...existing.quotes, quote] : [quote]
        if (!existing.quote) {
          existing.quote = quote
        }
      }
    }
  }

  return Array.from(markerMap.values()).sort((a, b) => {
    if (a.marker !== undefined && b.marker !== undefined) {
      return a.marker - b.marker
    }
    return 0
  })
}
