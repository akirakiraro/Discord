import { voiceJoinPayloadSchema, type VoiceSnapshotPayload } from '@radcord/shared'
import type { RealtimeBroadcaster } from './realtimeBroadcaster'
import { type VoiceMove, type VoiceRoster, type VoiceSeat } from './voiceRoster'

export interface VoicePresenceDeps {
  roster: VoiceRoster
  isVoiceChannel: (channelId: string) => boolean
  displayName: (userId: string) => string | undefined
  broadcast: RealtimeBroadcaster
}

/**
 * Valida o pedido do socket e publica quem entrou ou saiu da call.
 * O id do usuário vem da sessão, não do payload.
 * Exemplo: `hub.join(userId, socket.id, { channelId })`
 */
export class VoicePresenceHub {
  constructor(private readonly deps: VoicePresenceDeps) {}

  snapshot(): VoiceSnapshotPayload {
    return { occupants: this.deps.roster.snapshot() }
  }

  join(userId: string, socketId: string, payload: unknown): void {
    const seat = this.readSeat(userId, socketId, payload)
    if (!seat) return
    this.publish(this.deps.roster.join(seat))
  }

  leave(userId: string, socketId: string): void {
    const occupant = this.deps.roster.leave(userId, socketId)
    if (!occupant) return
    this.deps.broadcast.emit('voice:left', { channelId: occupant.channelId, userId: occupant.userId })
  }

  private readSeat(userId: string, socketId: string, payload: unknown): VoiceSeat | null {
    const parsed = voiceJoinPayloadSchema.safeParse(payload)
    if (!parsed.success || !this.deps.isVoiceChannel(parsed.data.channelId)) return null
    const displayName = this.deps.displayName(userId)
    if (!displayName) return null
    return { userId, socketId, channelId: parsed.data.channelId, displayName }
  }

  private publish(move: VoiceMove): void {
    if (move.left) this.deps.broadcast.emit('voice:left', move.left)
    if (move.joined) this.deps.broadcast.emit('voice:joined', move.joined)
  }
}
