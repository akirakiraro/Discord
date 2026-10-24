import { describe, expect, it } from 'vitest'
import type { KeyValueStorage } from '../savedLogin'
import {
  captureOptions,
  DEFAULT_MIC_PREFERENCES,
  loadMicPreferences,
  monitorCapture,
  resolveDeviceId,
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
    })

    expect(loadMicPreferences(storage)).toEqual({
      deviceId: 'headset',
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: true,
      gateDb: -10,
      inputGain: 4,
    })
  })

  it('ignora conteúdo corrompido', () => {
    const storage = new InMemoryStorage()
    storage.setItem('radcord.mic', '{')

    expect(loadMicPreferences(storage)).toEqual(DEFAULT_MIC_PREFERENCES)
  })

  it('captureOptions repassa eco e ganho automático escolhidos', () => {
    expect(captureOptions({
      deviceId: 'headset',
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: true,
      gateDb: -45,
      inputGain: 1,
    })).toEqual({
      deviceId: 'headset',
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: true,
      voiceIsolation: false,
    })
  })

  it('preferência antiga liga de novo a supressão e o ganho automático', () => {
    const storage = new InMemoryStorage()
    storage.setItem('radcord.mic', JSON.stringify({ deviceId: 'headset', noiseSuppression: false, autoGainControl: false, inputGain: 2 }))

    expect(loadMicPreferences(storage)).toMatchObject({ noiseSuppression: true, autoGainControl: true, echoCancellation: true, gateDb: -45, inputGain: 2 })
  })

  it('escuta da própria voz desliga o cancelamento de eco', () => {
    const monitoring = monitorCapture(DEFAULT_MIC_PREFERENCES, true)
    const normal = monitorCapture(DEFAULT_MIC_PREFERENCES, false)

    expect(monitoring.echoCancellation, 'eco pausado para o retorno não ser apagado').toBe(false)
    expect(monitoring.voiceIsolation, 'isolamento também apaga o retorno').toBe(false)
    expect(normal.echoCancellation, 'fora da escuta vale a preferência').toBe(true)
    expect(normal.voiceIsolation, 'o padrão do SDK não volta a ligar o isolamento').toBe(false)
  })

  it('resolveDeviceId volta ao padrão se o aparelho sumiu', () => {
    expect(resolveDeviceId('old', ['built-in'])).toBe('default')
    expect(resolveDeviceId('built-in', ['built-in'])).toBe('built-in')
  })
})
