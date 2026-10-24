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
import { withVoiceJoined, withVoiceLeft, withVoiceSnapshot, type VoiceRosterState } from '../voice/voiceRosterState'

type ServerEventName = keyof ServerToClientEvents

export interface RealtimeEventSource {
  on<E extends ServerEventName>(event: E, listener: ServerToClientEvents[E]): unknown
}

export interface RealtimeSinks {
  applyChat: (update: (state: ChatState) => ChatState) => void
  applyTyping: (update: (state: TypingState) => TypingState) => void
  applyRoster: (update: (state: VoiceRosterState) => VoiceRosterState) => void
  nowMs: () => number
}

/**
 * Liga cada evento do host a uma atualização pura do chat ou da presença de voz.
 * Exemplo: `bindRealtimeEvents(socket, { applyChat, applyTyping, applyRoster, nowMs: Date.now })`
 */
export function bindRealtimeEvents(source: RealtimeEventSource, sinks: RealtimeSinks): void {
  const { applyChat, applyTyping, applyRoster } = sinks
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
  source.on('voice:snapshot', (payload) => applyRoster((state) => withVoiceSnapshot(state, payload)))
  source.on('voice:joined', (occupant) => applyRoster((state) => withVoiceJoined(state, occupant)))
  source.on('voice:left', (payload) => applyRoster((state) => withVoiceLeft(state, payload)))
}
