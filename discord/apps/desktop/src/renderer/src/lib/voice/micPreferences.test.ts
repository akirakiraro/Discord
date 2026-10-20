import { describe, expect, it } from 'vitest'
import type { KeyValueStorage } from '../savedLogin'
import {
  captureOptions,
  clampInputGain,
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

    saveMicPreferences(storage, { deviceId: 'headset', noiseSuppression: false, inputGain: 9 })

    expect(loadMicPreferences(storage)).toEqual({ deviceId: 'headset', noiseSuppression: false, inputGain: 2 })
  })

  it('ignora conteúdo corrompido', () => {
    const storage = new InMemoryStorage()
    storage.setItem('radcord.mic', '{')

    expect(loadMicPreferences(storage)).toEqual(DEFAULT_MIC_PREFERENCES)
  })

  it('clampInputGain trata valor inválido como volume normal', () => {
    expect(clampInputGain(Number.NaN)).toBe(1)
    expect(clampInputGain(-1)).toBe(0)
  })

  it('captureOptions liga eco e ganho automático junto da escolha do usuário', () => {
    expect(captureOptions({ deviceId: 'headset', noiseSuppression: false, inputGain: 0.5 })).toEqual({
      deviceId: 'headset',
      noiseSuppression: false,
      echoCancellation: true,
      autoGainControl: true,
    })
  })

  it('resolveDeviceId volta ao padrão se o aparelho sumiu', () => {
    expect(resolveDeviceId('old', ['built-in'])).toBe('default')
    expect(resolveDeviceId('built-in', ['built-in'])).toBe('built-in')
  })
})
