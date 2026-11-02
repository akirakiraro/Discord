/**
 * Bots de teste da call. Só existe no `npm run desktop`: o instalador não leva
 * nada que importe este arquivo (ver `scripts/check-no-dev-tools.mjs`).
 */
export type DevBotPhase = 'starting' | 'joined' | 'playing' | 'idle' | 'error' | 'left'

export interface DevBotView {
  number: number
  name: string
  phase: DevBotPhase
  /** O que está tocando, o erro do bot, ou vazio. */
  detail: string
}

export interface DevBotAddRequest {
  apiUrl: string
  session: string
  channelId: string
}

export type DevBotAction = { kind: 'tone' } | { kind: 'wav'; path: string } | { kind: 'stop' } | { kind: 'remove' }

/** Exemplo: `parseDevBotAddRequest({ apiUrl: 'http://x:3000', session: 's', channelId: 'c' })`. */
export function parseDevBotAddRequest(raw: unknown): DevBotAddRequest | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { apiUrl, session, channelId } = raw as Record<string, unknown>
  if (typeof apiUrl !== 'string' || typeof session !== 'string' || typeof channelId !== 'string') return null
  if (!apiUrl || !session || !channelId) return null
  return { apiUrl, session, channelId }
}

/** Exemplo: `parseDevBotAction({ kind: 'wav', path: 'C:/a.wav' })`. */
export function parseDevBotAction(raw: unknown): DevBotAction | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { kind, path } = raw as Record<string, unknown>
  if (kind === 'tone' || kind === 'stop' || kind === 'remove') return { kind }
  if (kind === 'wav' && typeof path === 'string' && path !== '') return { kind, path }
  return null
}

/**
 * Linha de comando que o bot entende no stdin. `remove` vira `sair`.
 * Exemplo: `botCommandLine({ kind: 'wav', path: 'C:/a b.wav' })` devolve `'wav loop C:/a b.wav'`.
 */
export function botCommandLine(action: DevBotAction): string {
  if (action.kind === 'tone') return 'tom loop'
  if (action.kind === 'wav') return `wav loop ${action.path}`
  if (action.kind === 'stop') return 'parar'
  return 'sair'
}

/** Rótulo da fase no painel. Exemplo: `devBotPhaseLabel('playing')` devolve `'Tocando'`. */
export function devBotPhaseLabel(phase: DevBotPhase): string {
  const labels: Record<DevBotPhase, string> = {
    starting: 'Entrando…',
    joined: 'Na call',
    playing: 'Tocando',
    idle: 'Na call, em silêncio',
    error: 'Erro',
    left: 'Saiu',
  }
  return labels[phase]
}
