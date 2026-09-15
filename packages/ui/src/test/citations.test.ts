import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { groupCitations } from "../lib/citations.ts"

describe("Decision 4 Option A: Citation Rendering Rule", () => {
  it("groups multiple quotes sharing the same marker into one pill with several quoted lines", () => {
    // Measured 6 September 2026: Two claims drawn from the same chunk arrive with the same marker [1]
    const rawCitations = [
      {
        marker: 1,
        file_id: "file-abc-123",
        filename: "Lecture 3.pdf",
        page: 4,
        quote: "A partial index covers only the rows matching its WHERE clause.",
      },
      {
        marker: 1,
        file_id: "file-abc-123",
        filename: "Lecture 3.pdf",
        page: 4,
        quote: "the planner can only use it when the query repeats that same clause.",
      },
      {
        marker: 2,
        file_id: "file-def-456",
        filename: "Lecture 5.pdf",
        page: 12,
        quote: "B-trees maintain balance through node splitting.",
      },
    ]

    const pills = groupCitations(rawCitations)

    // Option A: Exactly one pill per marker
    assert.equal(pills.length, 2, "Expected 2 pills (one for [1], one for [2])")

    // Pill [1]
    const pill1 = pills[0]
    assert.equal(pill1.marker, 1)
    assert.equal(pill1.f, "file-abc-123")
    assert.equal(pill1.p, 4)
    assert.equal(pill1.l, "Lecture 3.pdf · p.4")
    assert.deepEqual(pill1.quotes, [
      "A partial index covers only the rows matching its WHERE clause.",
      "the planner can only use it when the query repeats that same clause.",
    ])
    assert.equal(
      pill1.quote,
      "A partial index covers only the rows matching its WHERE clause."
    )

    // Pill [2]
    const pill2 = pills[1]
    assert.equal(pill2.marker, 2)
    assert.equal(pill2.f, "file-def-456")
    assert.equal(pill2.p, 12)
    assert.deepEqual(pill2.quotes, [
      "B-trees maintain balance through node splitting.",
    ])
  })

  it("deduplicates identical quotes under the same marker", () => {
    const rawCitations = [
      {
        marker: 1,
        file_id: "file-1",
        page: 1,
        quote: "Identical quote line.",
      },
      {
        marker: 1,
        file_id: "file-1",
        page: 1,
        quote: "Identical quote line.",
      },
    ]

    const pills = groupCitations(rawCitations)
    assert.equal(pills.length, 1)
    assert.equal(pills[0].quotes?.length, 1)
  })

  it("handles empty or null citations gracefully", () => {
    assert.deepEqual(groupCitations([]), [])
    assert.deepEqual(groupCitations(null), [])
    assert.deepEqual(groupCitations(undefined), [])
  })
})
