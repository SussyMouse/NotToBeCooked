import type { ChatFile } from "../components/chat/Chat"

export interface Milestone {
  w: string
  n: string
  s: number // 1 = done, 0 = pending
  now?: boolean
  tag?: "exam" | "lab" | "project"
}

export interface MockCourse {
  id: string
  code: string
  name: string
  year: number
  semester: number
  description: string
  week: number
  weeks: number
  target: string
  roadmap: Milestone[]
}

export interface MockDocumentFile extends ChatFile {
  totalPages: number
  uploadedAt: string
  size: string
  contentByPage?: Record<number, string>
}
