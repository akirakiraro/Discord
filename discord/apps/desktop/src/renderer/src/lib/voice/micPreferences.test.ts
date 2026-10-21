import { describe, expect, it } from 'vitest'
import type { KeyValueStorage } from '../savedLogin'
import {
  captureOptions,
  DEFAULT_MIC_PREFERENCES,
  loadMicPreferences,
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
    })

    expect(loadMicPreferences(storage)).toEqual({
      deviceId: 'headset',
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: true,
      gateDb: -10,
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
    })).toEqual({
      deviceId: 'headset',
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: true,
    })
  })

  it('preferência antiga sem as caixas novas continua com eco e ganho ligados', () => {
    const storage = new InMemoryStorage()
    storage.setItem('radcord.mic', JSON.stringify({ deviceId: 'headset', noiseSuppression: true, inputGain: 2 }))

    expect(loadMicPreferences(storage)).toMatchObject({ echoCancellation: true, autoGainControl: true, gateDb: -45 })
  })

  it('resolveDeviceId volta ao padrão se o aparelho sumiu', () => {
    expect(resolveDeviceId('old', ['built-in'])).toBe('default')
    expect(resolveDeviceId('built-in', ['built-in'])).toBe('built-in')
  })
})
