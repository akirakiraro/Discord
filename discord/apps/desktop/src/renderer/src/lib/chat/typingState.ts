import type { TypingPayload } from '@radcord/shared'

/** canal → usuário → instante (ms) em que o "digitando…" expira. */
export type TypingState = Record<string, Record<string, number>>

export const TYPING_TTL_MS = 6000

export function withTypingStarted(state: TypingState, { channelId, userId }: TypingPayload, nowMs: number): TypingState {
  return { ...state, [channelId]: { ...state[channelId], [userId]: nowMs + TYPING_TTL_MS } }
}

/** Quem mandou mensagem parou de digitar, mesmo que o TTL ainda não tenha vencido. */
export function withTypingStopped(state: TypingState, { channelId, userId }: TypingPayload): TypingState {
  const channelTypists = state[channelId]
  if (!channelTypists?.[userId]) return state
  const { [userId]: _removed, ...rest } = channelTypists
  return { ...state, [channelId]: rest }
}

export function activeTypistIds(state: TypingState, channelId: string, nowMs: number): string[] {
  return Object.entries(state[channelId] ?? {})
    .filter(([, expiresAt]) => expiresAt > nowMs)
    .map(([userId]) => userId)
}

/**
 * Frase do indicador, como no Discord.
 * Exemplo: `describeTypists(['Bia', 'Caio'])` → `'Bia e Caio estão digitando…'`
 */
export function describeTypists(names: string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return `${names[0]} está digitando…`
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} e ${names.at(-1)} estão digitando…`
  return 'Várias pessoas estão digitando…'
}
