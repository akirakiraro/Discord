import { isMonitorIdentity } from '@radcord/shared'

/** Janela em que a mesma identidade não toca de novo. Cobre a reconexão rápida do LiveKit. */
export const CALL_CHIME_DEDUPE_MS = 800

/** A pessoa deste app. Não é um participante publicado na sala. */
export const SELF_CHIME_ID = '@self'

export type CallSoundKind = 'join' | 'leave'

/** `screen` é faixa de tela. `auxiliary` é monitor, agente e qualquer outro sufixo. */
export type CallChimeRole = 'person' | 'screen' | 'auxiliary'

export interface ChimeMark {
  at: number
  kind: CallSoundKind
}

export interface CallChimeState {
  /** Quem já contou nesta sala. A entrada dessas pessoas não toca de novo. */
  known: readonly string[]
  recent: Readonly<Record<string, ChimeMark>>
}

export interface CallChimeEvent {
  kind: CallSoundKind
  identity: string
  local: boolean
  role: CallChimeRole
  at: number
}

export interface CallChimePolicy {
  enabled: boolean
  /** true quando o som tem de ficar mudo. O surdo entra por aqui. */
  silenced: boolean
  dedupeMs: number
}

export interface CallChimeStep {
  state: CallChimeState
  play: CallSoundKind | null
}

export function emptyCallChime(): CallChimeState {
  return { known: [], recent: {} }
}

/**
 * Quem já estava na sala no instante em que a call conectou.
 * A entrada deles não toca; a saída, sim.
 * Exemplo: `seedCallChime(['ana', 'bob:monitor']).known` é `['ana']`.
 */
export function seedCallChime(identities: readonly string[]): CallChimeState {
  return { known: uniquePeople(identities), recent: {} }
}

/**
 * Pessoa da call, faixa de tela ou identidade que não deve tocar.
 * Exemplo: `callChimeRole('user-1:monitor')` é `'auxiliary'`.
 */
export function callChimeRole(identity: string, participantKind?: string | number): CallChimeRole {
  if (participantKind === 'screen') return 'screen'
  if (isCallPerson(identity, participantKind)) return 'person'
  return 'auxiliary'
}

/**
 * Ponto de extensão do surdo. Hoje devolve o `deafened` que o store já guarda.
 * Outra fonte de surdez entra só nesta função.
 * Exemplo: `isCallSoundSilenced(true)` devolve `true`.
 */
export function isCallSoundSilenced(deafened: boolean): boolean {
  return deafened
}

/**
 * Decide se a call toca entrada, saída ou nada. Não mexe em áudio.
 * Exemplo: `reduceCallChime(emptyCallChime(), eventoLocal, POLICY).play`
 */
export function reduceCallChime(state: CallChimeState, event: CallChimeEvent, policy: CallChimePolicy): CallChimeStep {
  if (event.role !== 'person') return { state, play: null }
  if (event.local) return reduceLocal(state, event, policy)
  return reduceRemote(state, event, policy)
}

function isCallPerson(identity: string, participantKind?: string | number): boolean {
  if (!isPlainUser(identity)) return false
  if (participantKind === undefined || participantKind === 0 || participantKind === 'STANDARD') return true
  return false
}

function isPlainUser(identity: string): boolean {
  if (identity === '' || isMonitorIdentity(identity)) return false
  return !identity.includes(':')
}

function uniquePeople(identities: readonly string[]): string[] {
  return [...new Set(identities.filter((identity) => isCallPerson(identity)))]
}

function reduceLocal(state: CallChimeState, event: CallChimeEvent, policy: CallChimePolicy): CallChimeStep {
  if (!canPlay(policy) || sameKindSoon(state, event, policy.dedupeMs)) return { state, play: null }
  return { state: remember(state, event), play: event.kind }
}

function reduceRemote(state: CallChimeState, event: CallChimeEvent, policy: CallChimePolicy): CallChimeStep {
  if (event.kind === 'join') return reduceRemoteJoin(state, event, policy)
  return reduceRemoteLeave(state, event, policy)
}

function reduceRemoteJoin(state: CallChimeState, event: CallChimeEvent, policy: CallChimePolicy): CallChimeStep {
  if (state.known.includes(event.identity)) return { state, play: null }
  const tracked = { ...state, known: [...state.known, event.identity] }
  if (!canPlay(policy) || isDuplicate(state, event, policy.dedupeMs)) return { state: tracked, play: null }
  return { state: remember(tracked, event), play: 'join' }
}

function reduceRemoteLeave(state: CallChimeState, event: CallChimeEvent, policy: CallChimePolicy): CallChimeStep {
  if (!state.known.includes(event.identity)) return { state, play: null }
  const tracked = { ...state, known: state.known.filter((identity) => identity !== event.identity) }
  if (!canPlay(policy) || isDuplicate(state, event, policy.dedupeMs)) return { state: tracked, play: null }
  return { state: remember(tracked, event), play: 'leave' }
}

function canPlay(policy: CallChimePolicy): boolean {
  return policy.enabled && !policy.silenced
}

function sameKindSoon(state: CallChimeState, event: CallChimeEvent, dedupeMs: number): boolean {
  const mark = state.recent[event.identity]
  if (!mark) return false
  return mark.kind === event.kind && event.at - mark.at < dedupeMs
}

function isDuplicate(state: CallChimeState, event: CallChimeEvent, dedupeMs: number): boolean {
  const mark = state.recent[event.identity]
  if (!mark || event.at - mark.at >= dedupeMs) return false
  if (mark.kind === event.kind) return true
  // Reconexão: a saída já tocou e a entrada volta na mesma janela. A entrada some.
  return mark.kind === 'leave' && event.kind === 'join'
}

function remember(state: CallChimeState, event: CallChimeEvent): CallChimeState {
  const recent = { ...state.recent, [event.identity]: { at: event.at, kind: event.kind } }
  return { ...state, recent }
}
