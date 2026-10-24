import { AudioPresets } from 'livekit-client'
import { describe, expect, it } from 'vitest'
import type { KeyValueStorage } from '../savedLogin'
import {
  captureOptions,
  clampCallSoundVolume,
  DEFAULT_CALL_SOUND_VOLUME,
  DEFAULT_MIC_PREFERENCES,
  loadMicPreferences,
  MIC_DEFAULTS_REVISION,
  microphonePublishOptions,
  monitorCapture,
  resolveDeviceId,
  roomAudioCaptureDefaults,
  saveMicPreferences,
} from './micPreferences'

class InMemoryStorage implements KeyValueStorage {
  private readonly entries = new Map<string, string>()

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value)
  }
}

describe('micPreferences', () => {
  it('devolve o padrão quando nada foi salvo', () => {
    expect(loadMicPreferences(new InMemoryStorage())).toEqual(DEFAULT_MIC_PREFERENCES)
  })

  it('lê de volta o que foi salvo e limita o ganho', () => {
    const storage = new InMemoryStorage()

    saveMicPreferences(storage, {
      deviceId: 'headset',
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: true,
      gateDb: -5,
      inputGain: 9,
      callSounds: false,
      callSoundVolume: 2,
    })

    expect(loadMicPreferences(storage)).toEqual({
      deviceId: 'headset',
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: true,
      gateDb: -10,
      inputGain: 4,
      callSounds: false,
      callSoundVolume: 1,
    })
  })

  it('ignora conteúdo corrompido', () => {
    const storage = new InMemoryStorage()
    storage.setItem('radcord.mic', '{')

    expect(loadMicPreferences(storage)).toEqual(DEFAULT_MIC_PREFERENCES)
  })

  it('captureOptions pede 48 kHz mono e desliga de verdade o que o usuário desligou', () => {
    expect(captureOptions({
      deviceId: 'headset',
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: true,
      gateDb: -45,
      inputGain: 1,
      callSounds: true,
      callSoundVolume: DEFAULT_CALL_SOUND_VOLUME,
    })).toEqual({
      deviceId: 'headset',
      channelCount: { ideal: 1 },
      sampleRate: { ideal: 48_000 },
      noiseSuppression: { exact: false },
      echoCancellation: { exact: false },
      autoGainControl: true,
      voiceIsolation: { exact: false },
    })
  })

  it('voiceIsolation fica desligado mesmo com a supressão ligada', () => {
    const captured = captureOptions({ ...DEFAULT_MIC_PREFERENCES, noiseSuppression: true })

    expect(captured.noiseSuppression).toBe(true)
    expect(captured.voiceIsolation).toEqual({ exact: false })
    expect(roomAudioCaptureDefaults()).toMatchObject({
      noiseSuppression: { exact: false },
      autoGainControl: { exact: false },
      voiceIsolation: { exact: false },
      channelCount: { ideal: 1 },
      sampleRate: { ideal: 48_000 },
    })
  })

  it('preferência antiga desliga a supressão e o ganho que abafavam', () => {
    const storage = new InMemoryStorage()
    storage.setItem('radcord.mic', JSON.stringify({
      deviceId: 'headset',
      noiseSuppression: true,
      autoGainControl: true,
      echoCancellation: false,
      inputGain: 2,
      defaultsRevision: 1,
    }))

    expect(loadMicPreferences(storage)).toMatchObject({
      noiseSuppression: false,
      autoGainControl: false,
      echoCancellation: false,
      gateDb: -45,
      inputGain: 2,
    })
  })

  it('revisão atual respeita a supressão ligada de propósito', () => {
    const storage = new InMemoryStorage()
    storage.setItem('radcord.mic', JSON.stringify({
      deviceId: 'headset',
      noiseSuppression: true,
      autoGainControl: true,
      defaultsRevision: MIC_DEFAULTS_REVISION,
    }))

    expect(loadMicPreferences(storage)).toMatchObject({ noiseSuppression: true, autoGainControl: true })
  })

  it('publica a voz a 96 kbps mono, com RED e sem DTX', () => {
    expect(microphonePublishOptions()).toEqual({
      audioPreset: AudioPresets.musicHighQuality,
      dtx: false,
      red: true,
      forceStereo: false,
    })
    expect(AudioPresets.musicHighQuality.maxBitrate, 'preset alto do Opus em mono').toBe(96_000)
  })

  it('escuta da própria voz desliga o cancelamento de eco', () => {
    const monitoring = monitorCapture(DEFAULT_MIC_PREFERENCES, true)
    const normal = monitorCapture(DEFAULT_MIC_PREFERENCES, false)

    expect(monitoring.echoCancellation, 'eco pausado para o retorno não ser apagado').toEqual({ exact: false })
    expect(monitoring.voiceIsolation, 'isolamento também apaga o retorno').toEqual({ exact: false })
    expect(normal.echoCancellation, 'fora da escuta vale a preferência').toBe(true)
    expect(normal.voiceIsolation, 'o padrão do SDK não volta a ligar o isolamento').toEqual({ exact: false })
  })

  it('preferência antiga liga os sons da call no volume padrão', () => {
    const storage = new InMemoryStorage()
    storage.setItem('radcord.mic', JSON.stringify({ deviceId: 'headset', defaultsRevision: 1 }))

    expect(loadMicPreferences(storage)).toMatchObject({
      callSounds: true,
      callSoundVolume: DEFAULT_CALL_SOUND_VOLUME,
      noiseSuppression: false,
    })
    expect(clampCallSoundVolume(Number.NaN)).toBe(DEFAULT_CALL_SOUND_VOLUME)
    expect(clampCallSoundVolume(0), 'mudo é um volume válido').toBe(0)
  })

  it('resolveDeviceId volta ao padrão se o aparelho sumiu', () => {
    expect(resolveDeviceId('old', ['built-in'])).toBe('default')
    expect(resolveDeviceId('built-in', ['built-in'])).toBe('built-in')
  })
})
