import type { VoiceLeftPayload, VoiceOccupantDto } from '@radcord/shared'

export interface VoiceSeat {
  userId: string
  socketId: string
  channelId: string
  displayName: string
}

export interface VoiceMove {
  left: VoiceLeftPayload | null
  joined: VoiceOccupantDto | null
}

/**
 * Um assento de voz por usuário, preso ao socket que entrou.
 * A segunda janela assume o lugar; a queda da primeira não tira quem ficou.
 * Exemplo: `roster.join({ userId, socketId, channelId, displayName })`
 */
export class VoiceRoster {
  private readonly seats = new Map<string, VoiceSeat>()

  join(seat: VoiceSeat): VoiceMove {
    assertSeat(seat)
    const current = this.seats.get(seat.userId)
    if (current && sameSeat(current, seat)) return { left: null, joined: null }
    this.place(current, seat)
    return { left: leftPayload(current, seat), joined: joinedPayload(current, seat) }
  }

  /**
   * Tira o assento só se este socket ainda for o dono.
   * Exemplo: `roster.leave(userId, socket.id)` devolve null para a janela antiga.
   */
  leave(userId: string, socketId: string): VoiceOccupantDto | null {
    const current = this.seats.get(userId)
    if (!current || current.socketId !== socketId) return null
    this.seats.delete(userId)
    return toOccupant(current)
  }

  snapshot(): VoiceOccupantDto[] {
    return [...this.seats.values()].map(toOccupant)
  }

  private place(current: VoiceSeat | undefined, seat: VoiceSeat): void {
    const moved = !current || current.channelId !== seat.channelId
    if (moved && current) this.seats.delete(seat.userId)
    this.seats.set(seat.userId, seat)
  }
}

function sameSeat(current: VoiceSeat, seat: VoiceSeat): boolean {
  return current.socketId === seat.socketId && current.channelId === seat.channelId && current.displayName === seat.displayName
}

function leftPayload(current: VoiceSeat | undefined, seat: VoiceSeat): VoiceLeftPayload | null {
  if (!current || current.channelId === seat.channelId) return null
  return { channelId: current.channelId, userId: seat.userId }
}

function joinedPayload(current: VoiceSeat | undefined, seat: VoiceSeat): VoiceOccupantDto | null {
  if (current && current.channelId === seat.channelId && current.displayName === seat.displayName) return null
  return toOccupant(seat)
}

function toOccupant(seat: VoiceSeat): VoiceOccupantDto {
  return { channelId: seat.channelId, userId: seat.userId, displayName: seat.displayName }
}

function assertSeat(seat: VoiceSeat): void {
  const missing = (['userId', 'socketId', 'channelId', 'displayName'] as const).filter((key) => seat[key] === '')
  if (missing.length === 0) return
  throw new Error(`assento ${JSON.stringify(seat)} inválido; campos vazios: ${missing.join(', ')}`)
}
