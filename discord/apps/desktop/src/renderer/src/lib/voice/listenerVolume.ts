import { isMonitorIdentity } from '@radcord/shared'
import type { KeyValueStorage } from '../savedLogin'

const STORAGE_KEY = 'radcord.listenerVolume'
const LISTENER_MIN_GAIN = 0
/** 100% é a faixa como chegou. O elemento de áudio já faz isso com volume 1. */
export const LISTENER_UNITY = 1
/** 200% é o teto do slider. O elemento de áudio não passa de 1, então o extra é ganho. */
export const LISTENER_MAX_GAIN = 2
const LIMIT_KNEE = 0.85
const CURVE_SAMPLES = 2049

export type ListenerPlayback = 'silent' | 'direct' | 'boost'

export interface ListenerVolumeFile {
  [localUserId: string]: Record<string, number>
}

/**
 * Volume com que esta pessoa ouve outra, entre mudo e o dobro.
 * Exemplo: `clampListenerGain(9)` devolve `2`.
 */
export function clampListenerGain(value: number): number {
  if (!Number.isFinite(value)) return LISTENER_UNITY
  return Math.min(LISTENER_MAX_GAIN, Math.max(LISTENER_MIN_GAIN, value))
}

/**
 * O slider fala em porcentagem inteira. 100 vira ganho 1.
 * Exemplo: `gainFromPercent(150)` devolve `1.5`.
 */
export function gainFromPercent(percent: number): number {
  if (!Number.isFinite(percent)) return LISTENER_UNITY
  return clampListenerGain(Math.round(percent) / 100)
}

/** Exemplo: `percentFromGain(1.5)` devolve `150`. */
export function percentFromGain(gain: number): number {
  return Math.round(clampListenerGain(gain) * 100)
}

/**
 * 100% e abaixo ficam no elemento de áudio, sem Web Audio.
 * Surdo cala tudo, mesmo com o ganho salvo acima de 1.
 * Exemplo: `listenerPlayback(1, false)` devolve `'direct'`.
 */
export function listenerPlayback(gain: number, deafened: boolean): ListenerPlayback {
  if (deafened) return 'silent'
  if (clampListenerGain(gain) > LISTENER_UNITY) return 'boost'
  return 'direct'
}

/**
 * Volume do elemento quando não há ganho extra. 1 não altera a faixa.
 * Exemplo: `directListenVolume(0.4)` devolve `0.4`.
 */
export function directListenVolume(gain: number): number {
  return Math.min(LISTENER_UNITY, clampListenerGain(gain))
}

/**
 * Não há slider para si nem para a escuta invisível.
 * Exemplo: `canAdjustListener('eu', 'ela')` é `true`.
 */
export function canAdjustListener(localUserId: string, remoteUserId: string): boolean {
  if (localUserId === '' || remoteUserId === '') return false
  if (localUserId === remoteUserId) return false
  return !isMonitorIdentity(remoteUserId)
}

/**
 * A call não toca a própria faixa nem a identidade `:monitor`.
 * Exemplo: `hearsRemoteIdentity('ela', false)` é `true`.
 */
export function hearsRemoteIdentity(identity: string, isLocal: boolean): boolean {
  if (isLocal || identity === '') return false
  return !isMonitorIdentity(identity)
}

/**
 * Limitador do volume acima de 100%. Até 0,85 o sample vezes o ganho sai igual.
 * Exemplo: `limitBoostedSample(0.2, 2)` devolve `0.4`.
 */
export function limitBoostedSample(sample: number, gain: number): number {
  if (!Number.isFinite(sample) || !Number.isFinite(gain)) return 0
  const scaled = sample * gain
  const magnitude = Math.abs(scaled)
  if (magnitude <= LIMIT_KNEE) return scaled
  return Math.sign(scaled) * compressOver(magnitude)
}

/**
 * Curva fixa no teto de 200%. O nó de ganho antes dela usa `preLimitGain`,
 * então mexer no slider não troca a curva.
 * Exemplo: `boostCurve()` no centro é `0`.
 */
export function boostCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(CURVE_SAMPLES * 4))
  for (let index = 0; index < CURVE_SAMPLES; index += 1) {
    const sample = (index / (CURVE_SAMPLES - 1)) * 2 - 1
    curve[index] = limitBoostedSample(sample, LISTENER_MAX_GAIN)
  }
  return curve
}

/**
 * Ganho do nó que alimenta o limitador. 200% é 1, para a curva ver o sample cheio.
 * Exemplo: `preLimitGain(1.5)` devolve `0.75`.
 */
export function preLimitGain(gain: number): number {
  return clampListenerGain(gain) / LISTENER_MAX_GAIN
}

/**
 * Volumes salvos neste aparelho, separados por quem está logado.
 * Exemplo: `loadListenerVolumes(localStorage)['eu']?.['ela']`
 */
export function loadListenerVolumes(storage: KeyValueStorage): ListenerVolumeFile {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    return sanitizeVolumeFile(JSON.parse(raw))
  } catch {
    return {}
  }
}

/** Exemplo: `listenerGain(file, 'eu', 'ela')` devolve `1` quando não há preferência. */
export function listenerGain(file: ListenerVolumeFile, localUserId: string, remoteUserId: string): number {
  const saved = file[localUserId]?.[remoteUserId]
  if (typeof saved !== 'number') return LISTENER_UNITY
  return clampListenerGain(saved)
}

/**
 * Grava o volume de uma pessoa para quem está logado neste aparelho.
 * Exemplo: `withListenerGain(file, 'eu', 'ela', 1.5)`.
 */
export function withListenerGain(
  file: ListenerVolumeFile,
  localUserId: string,
  remoteUserId: string,
  gain: number,
): ListenerVolumeFile {
  if (!canAdjustListener(localUserId, remoteUserId)) return file
  const people = { ...file[localUserId], [remoteUserId]: clampListenerGain(gain) }
  return { ...file, [localUserId]: people }
}

/** Exemplo: `saveListenerVolumes(localStorage, file)`. */
export function saveListenerVolumes(storage: KeyValueStorage, file: ListenerVolumeFile): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(file))
}

function compressOver(magnitude: number): number {
  const room = 1 - LIMIT_KNEE
  const over = magnitude - LIMIT_KNEE
  return LIMIT_KNEE + room * Math.tanh(over / room)
}

function sanitizeVolumeFile(parsed: unknown): ListenerVolumeFile {
  if (!parsed || typeof parsed !== 'object') return {}
  const file: ListenerVolumeFile = {}
  for (const [localUserId, people] of Object.entries(parsed)) {
    if (localUserId === '') continue
    file[localUserId] = sanitizePeople(people)
  }
  return file
}

function sanitizePeople(people: unknown): Record<string, number> {
  if (!people || typeof people !== 'object') return {}
  const clean: Record<string, number> = {}
  for (const [remoteUserId, gain] of Object.entries(people)) {
    if (!keepRemoteGain(remoteUserId, gain)) continue
    clean[remoteUserId] = clampListenerGain(gain)
  }
  return clean
}

function keepRemoteGain(remoteUserId: string, gain: unknown): gain is number {
  if (typeof gain !== 'number') return false
  if (remoteUserId === '' || isMonitorIdentity(remoteUserId)) return false
  return true
}
