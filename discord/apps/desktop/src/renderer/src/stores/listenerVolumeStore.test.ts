import { describe, expect, it } from 'vitest'
import type { KeyValueStorage } from '../lib/savedLogin'
import { listenerGain } from '../lib/voice/listenerVolume'
import { createListenerVolumeStore } from './listenerVolumeStore'

class MemoryStorage implements KeyValueStorage {
  private readonly entries = new Map<string, string>()

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value)
  }
}

describe('listenerVolumeStore', () => {
  it('grava no aparelho e devolve 100% quando não há preferência', () => {
    const storage = new MemoryStorage()
    const store = createListenerVolumeStore(storage)

    expect(listenerGain(store.getState().file, 'eu', 'ela')).toBe(1)
    store.getState().setGain('eu', 'ela', 1.5)
    store.getState().setGain('eu', 'eu', 2)

    const reopened = createListenerVolumeStore(storage)
    expect(listenerGain(reopened.getState().file, 'eu', 'ela')).toBe(1.5)
    expect(listenerGain(reopened.getState().file, 'eu', 'eu'), 'a própria voz não entra').toBe(1)
  })
})
