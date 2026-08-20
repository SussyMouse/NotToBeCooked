import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@workspace/contracts"
import { useWorkspace, selectActiveCourse, ragScope } from "../store/workspace"
import type { ChatMessage } from "../components/chat/ChatMessage"
import {
  extractMentionsAndResolve,
  type FileItem,
} from "../lib/mentions"

export const useChatSession = (
  courseId: string | null,
  availableFiles: FileItem[] = []
) => {
  const queryClient = useQueryClient()

  const activeCourseWorkspace = useWorkspace(selectActiveCourse)
  const activeConversationId =
    activeCourseWorkspace?.activeConversationId ?? null
  const setActiveConversation = useWorkspace(
    (state) => state.setActiveConversation
  )

  // fetch all sessions for this course
  const sessionsQuery = useQuery({
    queryKey: ["chat", "sessions", courseId],
    queryFn: () => api.chat.sessions(courseId ?? undefined),
    enabled: !!courseId,
  })

  // fetch active conversation messages
  const activeSessionQuery = useQuery({
    queryKey: ["chat", "session", activeConversationId],
    queryFn: () => api.chat.messages(activeConversationId!),
    enabled: !!activeConversationId,
  })

  // send a message /rag/query
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const scope = ragScope(useWorkspace.getState())
      // Parse @[Filename] mentions from text and resolve to file_ids
      const mentionResult = extractMentionsAndResolve(text, availableFiles)
      const effectiveFileIds = mentionResult.fileIds ?? scope.file_ids ?? null

      return api.chat.query({
        question: mentionResult.cleanQuestion || text,
        course_id: scope.course_id ?? null,
        conversation_id: activeConversationId,
        file_ids: effectiveFileIds,
        top_k: null, // use default 5
      })
    },
    onSuccess: (data) => {
      // If turn 1 created a new session, update activeConversationId in Zustand
      const newConversationId = (data as { conversation_id?: string })?.conversation_id
      if (!activeConversationId && newConversationId && courseId) {
        setActiveConversation(courseId, newConversationId)
      }

      // ensure session list is recent
      queryClient.invalidateQueries({
        queryKey: ["chat", "sessions", courseId],
      })

      // ensure message of current conversation is recent
      const targetId = activeConversationId || (data as { conversation_id?: string })?.conversation_id
      if (targetId) {
        queryClient.invalidateQueries({
          queryKey: ["chat", "session", targetId],
        })
      }
    },
  })

  // delete session
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return api.chat.delete_session(sessionId!)
    },
    onSuccess: (_data, deletedSessionId) => {
      queryClient.invalidateQueries({
        queryKey: ["chat", "sessions", courseId],
      })
      if (activeConversationId === deletedSessionId && courseId) {
        setActiveConversation(courseId, null)
      }
    },
  })

  // map server messages to ChatMessage format with filename lookup
  const messages: ChatMessage[] = (activeSessionQuery.data?.messages ?? []).map(
    (msgRead) => ({
      id: msgRead.id,
      role: msgRead.role as "user" | "assistant",
      content: msgRead.content,
      citations: (msgRead.citations ?? []).map((rawCitation) => {
        const citation = rawCitation as Record<string, unknown>
        const pageNum = Number(citation.page ?? citation.page_start ?? 1)
        const fileIdStr = String(citation.file_id ?? "")
        
        // Look up file in availableFiles for human-friendly label
        const matchedFile = availableFiles.find((f) => f.id === fileIdStr)
        const filename =
          typeof citation.filename === "string"
            ? citation.filename
            : matchedFile?.name || "Document"

        return {
          f: fileIdStr,
          p: pageNum,
          l: `${filename} · p.${pageNum}`,
          quote:
            typeof citation.quote === "string" ? citation.quote : undefined,
        }
      }),
    })
  )

  return {
    // Data
    sessions: (sessionsQuery.data ?? []).map((s) => ({
      id: s.id ?? "",
      title: s.title ?? "Untitled Chat",
      courseId: s.course_id,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })),
    messages,
    activeConversationId,

    // Loading states
    isLoadingSessions: sessionsQuery.isLoading,
    isLoadingMessages: activeSessionQuery.isLoading,
    isSending: sendMessageMutation.isPending,

    // Actions
    sendMessage: (text: string) => sendMessageMutation.mutateAsync(text),
    deleteSession: (sessionId: string) =>
      deleteSessionMutation.mutateAsync(sessionId),
    selectSession: (sessionId: string | null) => {
      if (courseId) setActiveConversation(courseId, sessionId)
    },
    startNewChat: () => {
      if (courseId) setActiveConversation(courseId, null)
    },
  }
}
