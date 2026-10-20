import type { ServerToClientEvents } from '@radcord/shared'
import {
  withChannelAdded,
  withMemberProfile,
  withMemberUpserted,
  withMessageRemoved,
  withMessageUpserted,
  withPresence,
  type ChatState,
} from '../chat/chatState'
import { withTypingStarted, withTypingStopped, type TypingState } from '../chat/typingState'

type ServerEventName = keyof ServerToClientEvents

export interface RealtimeEventSource {
  on<E extends ServerEventName>(event: E, listener: ServerToClientEvents[E]): unknown
}

export interface RealtimeSinks {
  applyChat: (update: (state: ChatState) => ChatState) => void
  applyTyping: (update: (state: TypingState) => TypingState) => void
  nowMs: () => number
}

/**
 * Liga cada evento do host a uma atualização pura do estado do chat.
 * Exemplo: `bindRealtimeEvents(socket, { applyChat, applyTyping, nowMs: Date.now })`
 */
export function bindRealtimeEvents(source: RealtimeEventSource, sinks: RealtimeSinks): void {
  const { applyChat, applyTyping } = sinks
  source.on('message:created', (message) => {
    applyChat((state) => withMessageUpserted(state, message))
    applyTyping((state) => withTypingStopped(state, { channelId: message.channelId, userId: message.authorId }))
  })
  source.on('message:updated', (message) => applyChat((state) => withMessageUpserted(state, message)))
  source.on('message:deleted', (payload) => applyChat((state) => withMessageRemoved(state, payload)))
  source.on('channel:created', (channel) => applyChat((state) => withChannelAdded(state, channel)))
  source.on('member:joined', (member) => applyChat((state) => withMemberUpserted(state, member)))
  source.on('member:updated', (member) => applyChat((state) => withMemberProfile(state, member)))
  source.on('presence:changed', (payload) => applyChat((state) => withPresence(state, payload)))
  source.on('typing:started', (payload) => applyTyping((state) => withTypingStarted(state, payload, sinks.nowMs())))
}
