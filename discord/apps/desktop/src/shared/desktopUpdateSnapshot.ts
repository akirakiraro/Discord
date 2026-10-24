export type UpdatePhase = 'checking' | 'downloading' | 'ready' | 'error' | 'current' | 'skipped'

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface UpdateSnapshot {
  phase: UpdatePhase
  version: string | null
  progress: UpdateProgress | null
  message: string | null
}

const PHASES: readonly UpdatePhase[] = ['checking', 'downloading', 'ready', 'error', 'current', 'skipped']

/** App de desenvolvimento: a checagem não roda e o login abre. */
export const SKIPPED_UPDATE: UpdateSnapshot = {
  phase: 'skipped',
  version: null,
  progress: null,
  message: null,
}

/** IPC ilegível continua bloqueando o login. Não vira "pode entrar". */
export const UNREADABLE_UPDATE: UpdateSnapshot = {
  phase: 'error',
  version: null,
  progress: null,
  message: 'Não foi possível ler o estado da atualização. Tente novamente.',
}

export function isUpdatePhase(value: unknown): value is UpdatePhase {
  return typeof value === 'string' && (PHASES as readonly string[]).includes(value)
}

export function isUpdateSnapshot(value: unknown): value is UpdateSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as UpdateSnapshot
  if (!isUpdatePhase(snapshot.phase)) return false
  if (!isNullableString(snapshot.version) || !isNullableString(snapshot.message)) return false
  if (snapshot.progress === null) return true
  return isUpdateProgress(snapshot.progress)
}

/**
 * Exemplo: `parseUpdateSnapshot(ipcRenderer.sendSync('radcord:update-snapshot'))`
 */
export function parseUpdateSnapshot(value: unknown): UpdateSnapshot {
  return isUpdateSnapshot(value) ? value : UNREADABLE_UPDATE
}

/** Login fica fechado até a versão instalada estar em dia, ou até o app ser o de desenvolvimento. */
export function updateBlocksLogin(snapshot: UpdateSnapshot): boolean {
  return snapshot.phase === 'checking'
    || snapshot.phase === 'downloading'
    || snapshot.phase === 'ready'
    || snapshot.phase === 'error'
}

export function cleanProgress(progress: UpdateProgress): UpdateProgress {
  return {
    percent: clampPercent(progress.percent),
    bytesPerSecond: nonNegative(progress.bytesPerSecond),
    transferred: nonNegative(progress.transferred),
    total: nonNegative(progress.total),
  }
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string'
}

function isUpdateProgress(value: unknown): value is UpdateProgress {
  if (!value || typeof value !== 'object') return false
  const progress = value as UpdateProgress
  return isFiniteNumber(progress.percent)
    && isFiniteNumber(progress.bytesPerSecond)
    && isFiniteNumber(progress.transferred)
    && isFiniteNumber(progress.total)
}

function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  if (value > 100) return 100
  return value
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}
