import type { MemberDto } from './authContract'
import type { ChannelDto, MessageDto } from './chatContract'

export interface MessageDeletedPayload {
  id: string
  channelId: string
}

export interface PresenceChangedPayload {
  userId: string
  online: boolean
}

export interface TypingPayload {
  channelId: string
  userId: string
}

export interface ServerToClientEvents {
  'message:created': (message: MessageDto) => void
  'message:updated': (message: MessageDto) => void
  'message:deleted': (payload: MessageDeletedPayload) => void
  'channel:created': (channel: ChannelDto) => void
  'member:joined': (member: MemberDto) => void
  'presence:changed': (payload: PresenceChangedPayload) => void
  'typing:started': (payload: TypingPayload) => void
}

export interface ClientToServerEvents {
  'typing:start': (payload: { channelId: string }) => void
}

export const REALTIME_UNAUTHORIZED = 'unauthorized'
