import type { AudioCaptureOptions } from 'livekit-client'
import type { KeyValueStorage } from '../savedLogin'
import { clampGateDb, DEFAULT_GATE_DB } from './micLevel'

const STORAGE_KEY = 'radcord.mic'
const MIN_GAIN = 0
const MAX_GAIN = 4
const DEFAULTS_REVISION = 1

export interface MicPreferences {
  deviceId: string
  noiseSuppression: boolean
  echoCancellation: boolean
  autoGainControl: boolean
  gateDb: number
  inputGain: number
}

export const DEFAULT_MIC_PREFERENCES: MicPreferences = {
  deviceId: 'default',
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  gateDb: DEFAULT_GATE_DB,
  inputGain: 1,
}

/**
 * Volume aplicado antes do portão: 0 é mudo, 1 é o microfone, 4 é o quádruplo.
 * Exemplo: `clampInputGain(9)` devolve `4`.
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
    const parsed = JSON.parse(raw) as Partial<MicPreferences> & { defaultsRevision?: number }
    const prefs = sanitizeMicPreferences(parsed)
    if (parsed.defaultsRevision === DEFAULTS_REVISION) return prefs
    return { ...prefs, noiseSuppression: true, autoGainControl: true }
  } catch {
    return DEFAULT_MIC_PREFERENCES
  }
}

/**
 * Exemplo: `saveMicPreferences(window.localStorage, DEFAULT_MIC_PREFERENCES)`
 */
export function saveMicPreferences(storage: KeyValueStorage, prefs: MicPreferences): MicPreferences {
  const stored = sanitizeMicPreferences(prefs)
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, defaultsRevision: DEFAULTS_REVISION }))
  return stored
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
    // O padrão do livekit-client liga voiceIsolation. O módulo trata o retorno como eco.
    voiceIsolation: false,
  }
}

/**
 * Captura usada na call. Com a escuta da própria voz, o eco sai.
 * O Chromium cancela o retorno do servidor porque ele parece eco do microfone.
 * Exemplo: `monitorCapture(prefs, true).echoCancellation` devolve `false`.
 */
export function monitorCapture(prefs: MicPreferences, monitoring: boolean): AudioCaptureOptions {
  const options = captureOptions(prefs)
  if (!monitoring) return options
  // Eco e isolamento continuam apagando o áudio que volta do servidor.
  return { ...options, echoCancellation: false, voiceIsolation: false }
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
    inputGain: clampInputGain(typeof raw.inputGain === 'number' ? raw.inputGain : 1),
  }
}
