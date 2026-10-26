export type HostPhase = 'unavailable' | 'off' | 'starting' | 'on' | 'stopping' | 'error' | 'external'

export type HostFirewall = 'unknown' | 'ok' | 'missing'

export interface HostSnapshot {
  phase: HostPhase
  moduleReady: boolean
  ownedByApp: boolean
  radminIp: string | null
  message: string | null
  online: number
  inVoice: number
  firewall: HostFirewall
  apiLog: string[]
  livekitLog: string[]
}

export interface HostQuitPrompt {
  online: number
  inVoice: number
  message: string
}

export interface HostStopPreview {
  allowed: boolean
  online: number
  inVoice: number
  message: string
}

const PHASES: readonly HostPhase[] = ['unavailable', 'off', 'starting', 'on', 'stopping', 'error', 'external']
const FIREWALLS: readonly HostFirewall[] = ['unknown', 'ok', 'missing']

/** Ainda não achou o módulo, ou o IPC veio ilegível. A tela não mostra a opção. */
export const HOST_UNAVAILABLE: HostSnapshot = {
  phase: 'unavailable',
  moduleReady: false,
  ownedByApp: false,
  radminIp: null,
  message: null,
  online: 0,
  inVoice: 0,
  firewall: 'unknown',
  apiLog: [],
  livekitLog: [],
}

/**
 * Nome da fase na tela. Exemplo: `hostPhaseLabel('external')` → `'Ligado fora do app'`.
 */
export function hostPhaseLabel(phase: HostPhase): string {
  if (phase === 'unavailable') return 'Indisponível'
  if (phase === 'off') return 'Desligado'
  if (phase === 'starting') return 'Iniciando'
  if (phase === 'on') return 'Ligado'
  if (phase === 'stopping') return 'Desligando'
  if (phase === 'error') return 'Erro'
  return 'Ligado fora do app'
}

/**
 * Linha de quem está no host. Exemplo: `hostOccupancyLine(2, 1)` → `'2 pessoas online, 1 na call'`.
 */
export function hostOccupancyLine(online: number, inVoice: number): string {
  return `${online} pessoas online, ${inVoice} na call`
}

/**
 * Exemplo: `parseHostSnapshot(ipcRenderer.invoke('radcord:host-status'))`.
 */
export function parseHostSnapshot(value: unknown): HostSnapshot {
  if (!isHostSnapshot(value)) return HOST_UNAVAILABLE
  return {
    phase: value.phase,
    moduleReady: value.moduleReady,
    ownedByApp: value.ownedByApp,
    radminIp: value.radminIp,
    message: value.message,
    online: value.online,
    inVoice: value.inVoice,
    firewall: value.firewall,
    apiLog: [...value.apiLog],
    livekitLog: [...value.livekitLog],
  }
}

/**
 * Exemplo: `parseHostQuitPrompt(payload)` devolve null se faltar a frase.
 */
export function parseHostQuitPrompt(value: unknown): HostQuitPrompt | null {
  if (!value || typeof value !== 'object') return null
  const prompt = value as HostQuitPrompt
  if (!isCount(prompt.online) || !isCount(prompt.inVoice) || typeof prompt.message !== 'string' || prompt.message === '') return null
  return { online: prompt.online, inVoice: prompt.inVoice, message: prompt.message }
}

/**
 * O botão Desligar manda `{ confirmed: true }` só depois do diálogo.
 * Exemplo: `parseConfirmedFlag({ confirmed: true })` → `true`.
 */
export function parseConfirmedFlag(value: unknown): boolean | null {
  if (!value || typeof value !== 'object') return null
  const flag = (value as { confirmed?: unknown }).confirmed
  if (typeof flag !== 'boolean') return null
  return flag
}

function isHostSnapshot(value: unknown): value is HostSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as HostSnapshot
  if (!PHASES.includes(snapshot.phase) || !FIREWALLS.includes(snapshot.firewall)) return false
  if (typeof snapshot.moduleReady !== 'boolean' || typeof snapshot.ownedByApp !== 'boolean') return false
  if (!isNullableString(snapshot.radminIp) || !isNullableString(snapshot.message)) return false
  if (!isCount(snapshot.online) || !isCount(snapshot.inVoice)) return false
  return isStringList(snapshot.apiLog) && isStringList(snapshot.livekitLog)
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string'
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}
