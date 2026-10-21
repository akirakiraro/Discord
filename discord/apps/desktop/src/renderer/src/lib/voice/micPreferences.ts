import type { AudioCaptureOptions } from 'livekit-client'
import type { KeyValueStorage } from '../savedLogin'

const STORAGE_KEY = 'radcord.mic'
const MIN_GAIN = 0
const MAX_GAIN = 2

export interface MicPreferences {
  deviceId: string
  noiseSuppression: boolean
  echoCancellation: boolean
  autoGainControl: boolean
  inputGain: number
}

export const DEFAULT_MIC_PREFERENCES: MicPreferences = {
  deviceId: 'default',
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  inputGain: 1,
}

/**
 * Mantém o ganho do microfone entre 0 (mudo) e 2 (o dobro).
 * Exemplo: `clampInputGain(3)` devolve `2`.
 */
export function clampInputGain(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MIC_PREFERENCES.inputGain
  return Math.min(MAX_GAIN, Math.max(MIN_GAIN, value))
}

/**
 * Lê o microfone escolhido, a supressão e a sensibilidade salvos neste aparelho.
 * Exemplo: `loadMicPreferences(window.localStorage).deviceId`
 */
export function loadMicPreferences(storage: KeyValueStorage): MicPreferences {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_MIC_PREFERENCES
  try {
    return sanitizeMicPreferences(JSON.parse(raw) as Partial<MicPreferences>)
  } catch {
    return DEFAULT_MIC_PREFERENCES
  }
}

/**
 * Exemplo: `saveMicPreferences(window.localStorage, DEFAULT_MIC_PREFERENCES)`
 */
export function saveMicPreferences(storage: KeyValueStorage, prefs: MicPreferences): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(sanitizeMicPreferences(prefs)))
}

/**
 * Opções de captura do LiveKit a partir do que o usuário escolheu.
 * A sensibilidade é um `GainNode` à parte.
 * Exemplo: `captureOptions({ deviceId: 'default', noiseSuppression: false, echoCancellation: true, autoGainControl: false, inputGain: 1 })`
 */
export function captureOptions(prefs: MicPreferences): AudioCaptureOptions {
  return {
    deviceId: prefs.deviceId,
    noiseSuppression: prefs.noiseSuppression,
    echoCancellation: prefs.echoCancellation,
    autoGainControl: prefs.autoGainControl,
  }
}

/**
 * Se o microfone salvo foi desplugado, volta para o padrão do sistema.
 * Exemplo: `resolveDeviceId('old-mic', ['built-in'])` devolve `'default'`.
 */
export function resolveDeviceId(deviceId: string, knownIds: readonly string[]): string {
  if (deviceId === 'default' || knownIds.includes(deviceId)) return deviceId
  return 'default'
}

function sanitizeMicPreferences(raw: Partial<MicPreferences>): MicPreferences {
  return {
    deviceId: typeof raw.deviceId === 'string' && raw.deviceId !== '' ? raw.deviceId : 'default',
    noiseSuppression: raw.noiseSuppression !== false,
    echoCancellation: raw.echoCancellation !== false,
    autoGainControl: raw.autoGainControl !== false,
    inputGain: clampInputGain(typeof raw.inputGain === 'number' ? raw.inputGain : 1),
  }
}
