import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@workspace/contracts"
import { useWorkspace, selectActiveCourse, ragScope } from "../store/workspace"
import type { ChatMessage } from "../components/chat/ChatMessage"

export const useChatSession = (courseId: string | null) => {
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
      return api.chat.query({
        question: text,
        course_id: scope.course_id ?? null,
        conversation_id: activeConversationId,
        file_ids: scope.file_ids ?? null,
        top_k: null, // use default 5
      })
    },
    onSuccess: () => {
      // ensure session list is recent
      queryClient.invalidateQueries({
        queryKey: ["chat", "sessions", courseId],
      })

      // ensure message of current conversation is recent
      if (activeConversationId) {
        queryClient.invalidateQueries({
          queryKey: ["chat", "session", activeConversationId],
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

  // map server messages to ChatMessage format
  const messages: ChatMessage[] = (activeSessionQuery.data?.messages ?? []).map(
    (msgRead) => ({
      id: msgRead.id,
      role: msgRead.role as "user" | "assistant",
      content: msgRead.content,
      citations: (msgRead.citations ?? []).map((rawCitation) => {
        const citation = rawCitation as Record<string, unknown>
        const pageNum = Number(citation.page ?? citation.page_start ?? 1)
        const filename =
          typeof citation.filename === "string" ? citation.filename : "Document"
        return {
          f: String(citation.file_id ?? ""),
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
