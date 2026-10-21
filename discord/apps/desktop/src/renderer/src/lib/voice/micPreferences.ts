import type { AudioCaptureOptions } from 'livekit-client'
import type { KeyValueStorage } from '../savedLogin'
import { clampGateDb, DEFAULT_GATE_DB } from './micLevel'

const STORAGE_KEY = 'radcord.mic'

export interface MicPreferences {
  deviceId: string
  noiseSuppression: boolean
  echoCancellation: boolean
  autoGainControl: boolean
  gateDb: number
}

export const DEFAULT_MIC_PREFERENCES: MicPreferences = {
  deviceId: 'default',
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  gateDb: DEFAULT_GATE_DB,
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
 * O portão de sensibilidade fica num processador à parte.
 * Exemplo: `captureOptions({ deviceId: 'default', noiseSuppression: false, echoCancellation: true, autoGainControl: false, gateDb: -45 })`
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
    gateDb: clampGateDb(typeof raw.gateDb === 'number' ? raw.gateDb : DEFAULT_GATE_DB),
  }
}
