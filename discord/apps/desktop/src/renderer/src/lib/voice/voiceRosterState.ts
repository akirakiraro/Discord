import { isMonitorIdentity, type VoiceLeftPayload, type VoiceOccupantDto, type VoiceSnapshotPayload } from '@radcord/shared'

export interface VoiceRosterState {
  occupants: VoiceOccupantDto[]
}

export const EMPTY_VOICE_ROSTER: VoiceRosterState = { occupants: [] }

export interface LiveVoiceIdentity {
  identity: string
  name: string
}

export interface SidebarVoiceRow {
  userId: string
  displayName: string
}

/**
 * Substitui a lista inteira. Quem abre o app depois da call usa isso no lugar de eventos antigos.
 * Exemplo: `withVoiceSnapshot(EMPTY_VOICE_ROSTER, { occupants })`
 */
export function withVoiceSnapshot(_state: VoiceRosterState, snapshot: VoiceSnapshotPayload): VoiceRosterState {
  return { occupants: uniqueByUser(snapshot.occupants) }
}

/**
 * Move a pessoa para o fim do roster, saindo do canal anterior se ela estava em outro.
 * Exemplo: `withVoiceJoined(state, { channelId, userId, displayName })`
 */
export function withVoiceJoined(state: VoiceRosterState, occupant: VoiceOccupantDto): VoiceRosterState {
  const others = state.occupants.filter((current) => current.userId !== occupant.userId)
  return { occupants: [...others, occupant] }
}

/**
 * Ignora saída de um canal que a pessoa já deixou, quando a troca chega fora de ordem.
 * Exemplo: `withVoiceLeft(state, { channelId, userId })`
 */
export function withVoiceLeft(state: VoiceRosterState, payload: VoiceLeftPayload): VoiceRosterState {
  return { occupants: state.occupants.filter((occupant) => !leftThisSeat(occupant, payload)) }
}

/** Exemplo: `occupantsInChannel(roster, channel.id)` */
export function occupantsInChannel(state: VoiceRosterState, channelId: string): VoiceOccupantDto[] {
  return state.occupants.filter((occupant) => occupant.channelId === channelId)
}

/**
 * Fora da call a barra só mostra o roster do host. Dentro, soma quem o LiveKit já listou
 * e esconde a escuta `:monitor`.
 * Exemplo: `sidebarVoiceRows(roster, live, false)`
 */
export function sidebarVoiceRows(roster: VoiceOccupantDto[], live: LiveVoiceIdentity[], connectedHere: boolean): SidebarVoiceRow[] {
  if (!connectedHere) return roster.map(toRow)
  return mergeLiveRows(roster, live.filter((person) => !isMonitorIdentity(person.identity)))
}

function toRow(occupant: VoiceOccupantDto): SidebarVoiceRow {
  return { userId: occupant.userId, displayName: occupant.displayName }
}

function mergeLiveRows(roster: VoiceOccupantDto[], live: LiveVoiceIdentity[]): SidebarVoiceRow[] {
  const known = new Set(roster.map((occupant) => occupant.userId))
  const extras = live.filter((person) => !known.has(person.identity)).map(liveRow)
  return [...roster.map(toRow), ...extras]
}

function liveRow(person: LiveVoiceIdentity): SidebarVoiceRow {
  return { userId: person.identity, displayName: person.name || person.identity }
}

function leftThisSeat(occupant: VoiceOccupantDto, payload: VoiceLeftPayload): boolean {
  return occupant.userId === payload.userId && occupant.channelId === payload.channelId
}

function uniqueByUser(occupants: VoiceOccupantDto[]): VoiceOccupantDto[] {
  const byUser = new Map<string, VoiceOccupantDto>()
  for (const occupant of occupants) byUser.set(occupant.userId, occupant)
  return [...byUser.values()]
}
