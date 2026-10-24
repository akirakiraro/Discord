import type { MemberDto } from './authContract'
import type { ChannelDto, MessageDto } from './chatContract'
import type { AppReleasePayload } from './releaseContract'
import type { VoiceJoinPayload, VoiceLeftPayload, VoiceOccupantDto, VoiceSnapshotPayload } from './voiceContract'

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
  'member:updated': (member: MemberDto) => void
  'presence:changed': (payload: PresenceChangedPayload) => void
  'typing:started': (payload: TypingPayload) => void
  'voice:joined': (occupant: VoiceOccupantDto) => void
  'voice:left': (payload: VoiceLeftPayload) => void
  /** Estado atual, mandado só para quem acabou de conectar. */
  'voice:snapshot': (payload: VoiceSnapshotPayload) => void
  /** Release pública mais nova. No connect e quando a tag do GitHub muda. */
  'app:release': (payload: AppReleasePayload) => void
}

export interface ClientToServerEvents {
  'typing:start': (payload: { channelId: string }) => void
  'voice:join': (payload: VoiceJoinPayload) => void
  'voice:leave': () => void
}

export const REALTIME_UNAUTHORIZED = 'unauthorized'
