import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  parseMentions,
  resolveMentionFileIds,
  extractMentionsAndResolve,
  type FileItem,
} from "../lib/mentions.ts"

const MOCK_FILES: FileItem[] = [
  {
    id: "f202-lec4",
    name: "Lecture 4 - Architectural Patterns.pdf",
    category: "Lecture Decks",
  },
  {
    id: "f202-lec5",
    name: "Lecture 5 - Distributed Systems.pdf",
    category: "Lecture Decks",
  },
  {
    id: "f202-lab3",
    name: "Lab 3 - State Management.pdf",
    category: "Lab Handouts",
  },
  {
    id: "f202-tut1",
    name: "Tutorial 1 - Component Testing.pdf",
    category: "Tutorials & PYQs",
  },
]

describe("Mention Parsing & Resolution Utility", () => {
  describe("parseMentions", () => {
    it("returns unmodified question when no @-mentions exist", () => {
      const result = parseMentions("Explain QuickSort algorithm")
      assert.equal(result.cleanQuestion, "Explain QuickSort algorithm")
      assert.deepEqual(result.mentionedLabels, [])
    })

    it("converts atomic @[Filename] tags to natural titles in clean question", () => {
      const result = parseMentions(
        "Explain QuickSort @[Lecture 4 - Architectural Patterns.pdf]"
      )
      assert.equal(
        result.cleanQuestion,
        "Explain QuickSort Lecture 4 - Architectural Patterns"
      )
      assert.deepEqual(result.mentionedLabels, [
        "Lecture 4 - Architectural Patterns.pdf",
      ])
    })

    it("converts multiple atomic mentions into natural comparative question", () => {
      const result = parseMentions(
        "@[Lecture 4 - Architectural Patterns.pdf] vs @[Lab 3 - State Management.pdf] tell me their difference"
      )
      assert.equal(
        result.cleanQuestion,
        "Lecture 4 - Architectural Patterns vs Lab 3 - State Management tell me their difference"
      )
      assert.deepEqual(result.mentionedLabels, [
        "Lecture 4 - Architectural Patterns.pdf",
        "Lab 3 - State Management.pdf",
      ])
    })

    it("handles standard @Word syntax", () => {
      const result = parseMentions("Summarize @Lecture4 for exam prep")
      assert.equal(result.cleanQuestion, "Summarize Lecture4 for exam prep")
      assert.deepEqual(result.mentionedLabels, ["Lecture4"])
    })
  })

  describe("resolveMentionFileIds", () => {
    it("resolves exact filename match", () => {
      const ids = resolveMentionFileIds(
        ["Lecture 4 - Architectural Patterns.pdf"],
        MOCK_FILES
      )
      assert.deepEqual(ids, ["f202-lec4"])
    })

    it("resolves category mention to all files in that category", () => {
      const ids = resolveMentionFileIds(["Lecture Decks"], MOCK_FILES)
      assert.deepEqual(ids, ["f202-lec4", "f202-lec5"])
    })

    it("resolves partial filename substring match", () => {
      const ids = resolveMentionFileIds(["Lecture 5"], MOCK_FILES)
      assert.deepEqual(ids, ["f202-lec5"])
    })

    it("returns empty array when mention does not match any file", () => {
      const ids = resolveMentionFileIds(["NonExistentFile.pdf"], MOCK_FILES)
      assert.deepEqual(ids, [])
    })
  })

  describe("extractMentionsAndResolve", () => {
    it("returns clean question and resolved file_ids for RAG query payload", () => {
      const result = extractMentionsAndResolve(
        "Can you explain state management? @[Lab 3 - State Management.pdf]",
        MOCK_FILES
      )
      assert.equal(
        result.cleanQuestion,
        "Can you explain state management? Lab 3 - State Management"
      )
      assert.deepEqual(result.fileIds, ["f202-lab3"])
      assert.deepEqual(result.mentionedLabels, [
        "Lab 3 - State Management.pdf",
      ])
    })

    it("returns fileIds null when prompt has no mentions", () => {
      const result = extractMentionsAndResolve(
        "What is Raft consensus?",
        MOCK_FILES
      )
      assert.equal(result.cleanQuestion, "What is Raft consensus?")
      assert.equal(result.fileIds, null)
    })
  })
})
