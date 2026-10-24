import { AudioPresets, type AudioCaptureOptions, type TrackPublishOptions } from 'livekit-client'
import type { KeyValueStorage } from '../savedLogin'
import { clampGateDb, DEFAULT_GATE_DB } from './micLevel'

const STORAGE_KEY = 'radcord.mic'
const MIN_GAIN = 0
const MAX_GAIN = 4
/**
 * A revisão 1 religava supressão e ganho automático. Esse par, mais o
 * `voiceIsolation` do LiveKit, faz o Chromium processar a voz em banda estreita.
 */
export const MIC_DEFAULTS_REVISION = 2
const VOICE_SAMPLE_RATE = 48_000

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
  noiseSuppression: false,
  echoCancellation: true,
  autoGainControl: false,
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
 * Preferência de revisão antiga perde a supressão e o ganho que abafavam a voz.
 * Exemplo: `loadMicPreferences(window.localStorage).deviceId`
 */
export function loadMicPreferences(storage: KeyValueStorage): MicPreferences {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_MIC_PREFERENCES
  try {
    const parsed = JSON.parse(raw) as Partial<MicPreferences> & { defaultsRevision?: number }
    const prefs = sanitizeMicPreferences(parsed)
    if (parsed.defaultsRevision === MIC_DEFAULTS_REVISION) return prefs
    return { ...prefs, noiseSuppression: false, autoGainControl: false }
  } catch {
    return DEFAULT_MIC_PREFERENCES
  }
}

/**
 * Exemplo: `saveMicPreferences(window.localStorage, DEFAULT_MIC_PREFERENCES)`
 */
export function saveMicPreferences(storage: KeyValueStorage, prefs: MicPreferences): MicPreferences {
  const stored = sanitizeMicPreferences(prefs)
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, defaultsRevision: MIC_DEFAULTS_REVISION }))
  return stored
}

/**
 * Opções de captura do LiveKit a partir do que o usuário escolheu.
 * O portão de sensibilidade fica num processador à parte.
 * Exemplo: `captureOptions(DEFAULT_MIC_PREFERENCES).voiceIsolation`
 */
export function captureOptions(prefs: MicPreferences): AudioCaptureOptions {
  return {
    ...voiceCaptureShape(),
    deviceId: prefs.deviceId,
    noiseSuppression: optionalProcessing(prefs.noiseSuppression),
    echoCancellation: optionalProcessing(prefs.echoCancellation),
    autoGainControl: optionalProcessing(prefs.autoGainControl),
  }
}

/**
 * O que a sala usa quando a chamada não manda um campo. O LiveKit, sozinho,
 * liga `voiceIsolation`, que ignora a supressão escolhida e abafa o microfone.
 * Exemplo: `roomAudioCaptureDefaults().voiceIsolation`
 */
export function roomAudioCaptureDefaults(): AudioCaptureOptions {
  return {
    ...voiceCaptureShape(),
    noiseSuppression: disabledProcessing(),
    echoCancellation: true,
    autoGainControl: disabledProcessing(),
  }
}

/**
 * Publicação do microfone. 96 kbps mono é a faixa nítida do Opus; 48 kbps era o padrão do LiveKit.
 * DTX fica desligado: na rede do Radmin o silêncio não precisa economizar, e a consoante some.
 * RED continua, para um pacote UDP perdido não virar buraco.
 * Exemplo: `microphonePublishOptions().forceStereo` devolve `false`.
 */
export function microphonePublishOptions(): TrackPublishOptions {
  return {
    audioPreset: AudioPresets.musicHighQuality,
    dtx: false,
    red: true,
    forceStereo: false,
  }
}

/**
 * Captura usada na call. Com a escuta da própria voz, o eco sai.
 * O Chromium cancela o retorno do servidor porque ele parece eco do microfone.
 * O isolamento fica `{ exact: false }` em toda captura: `false` solto não desliga o módulo.
 * Exemplo: `monitorCapture(prefs, true).echoCancellation` devolve `{ exact: false }`.
 */
export function monitorCapture(prefs: MicPreferences, monitoring: boolean): AudioCaptureOptions {
  const options = captureOptions(prefs)
  if (!monitoring) return options
  // Eco e isolamento apagam o áudio que volta do servidor. `exact` desliga de verdade.
  return { ...options, echoCancellation: disabledProcessing(), voiceIsolation: disabledProcessing() }
}

/**
 * Se o microfone salvo foi desplugado, volta para o padrão do sistema.
 * Exemplo: `resolveDeviceId('old-mic', ['built-in'])` devolve `'default'`.
 */
export function resolveDeviceId(deviceId: string, knownIds: readonly string[]): string {
  if (deviceId === 'default' || knownIds.includes(deviceId)) return deviceId
  return 'default'
}

function voiceCaptureShape(): AudioCaptureOptions {
  return {
    channelCount: { ideal: 1 },
    sampleRate: { ideal: VOICE_SAMPLE_RATE },
    voiceIsolation: disabledProcessing(),
  }
}

/**
 * `false` solto é só um ideal: o Chromium mantém o módulo de áudio e corta os agudos.
 * Desligar de verdade pede `exact`.
 */
function optionalProcessing(enabled: boolean): true | { exact: false } {
  if (enabled) return true
  return disabledProcessing()
}

function disabledProcessing(): { exact: false } {
  return { exact: false }
}

function sanitizeMicPreferences(raw: Partial<MicPreferences>): MicPreferences {
  return {
    deviceId: typeof raw.deviceId === 'string' && raw.deviceId !== '' ? raw.deviceId : 'default',
    noiseSuppression: raw.noiseSuppression === true,
    echoCancellation: raw.echoCancellation !== false,
    autoGainControl: raw.autoGainControl === true,
    gateDb: clampGateDb(typeof raw.gateDb === 'number' ? raw.gateDb : DEFAULT_GATE_DB),
    inputGain: clampInputGain(typeof raw.inputGain === 'number' ? raw.inputGain : 1),
  }
}
