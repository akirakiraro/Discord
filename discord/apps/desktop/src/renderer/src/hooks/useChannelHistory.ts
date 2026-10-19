import { useCallback, useEffect, useState } from 'react'
import type { MessageDto } from '@radcord/shared'
import { withHistoryPrepended } from '../lib/chat/chatState'
import { useChatStore } from '../stores/chatStore'
import { useSessionStore } from '../stores/sessionStore'

export interface ChannelHistory {
  messages: MessageDto[] | undefined
  hasMore: boolean
  loadingOlder: boolean
  error: string | null
  loadOlder: () => void
}

/**
 * Histórico de um canal de texto: busca a página mais recente na primeira abertura
 * e páginas antigas sob demanda.
 * Exemplo: `const { messages, hasMore, loadOlder } = useChannelHistory(channelId)`
 */
export function useChannelHistory(channelId: string): ChannelHistory {
  const api = useSessionStore((store) => store.session?.api)
  const messages = useChatStore((store) => store.chat.messagesByChannel[channelId])
  const hasMore = useChatStore((store) => store.chat.hasMoreByChannel[channelId] ?? false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(
    async (beforeId?: string) => {
      if (!api) return
      setError(null)
      try {
        const page = await api.listMessages(channelId, beforeId)
        useChatStore.getState().applyChat((state) => withHistoryPrepended(state, channelId, page))
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : String(failure))
      }
    },
    [api, channelId],
  )

  useEffect(() => {
    if (messages === undefined) void fetchPage()
  }, [messages, fetchPage])

  const loadOlder = useCallback(() => {
    setLoadingOlder(true)
    void fetchPage(messages?.[0]?.id).finally(() => setLoadingOlder(false))
  }, [fetchPage, messages])

  return { messages, hasMore, loadingOlder, error, loadOlder }
}
