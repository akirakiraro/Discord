import { describe, expect, it } from 'vitest'
import type { KeyValueStorage } from '../lib/savedLogin'
import { createMicPrefsStore } from './micPrefsStore'

class InMemoryStorage implements KeyValueStorage {
  private readonly entries = new Map<string, string>()

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value)
  }
}

describe('micPrefsStore', () => {
  it('grava a entrada e esquece um id que não está mais na lista', () => {
    const storage = new InMemoryStorage()
    const store = createMicPrefsStore(storage)

    store.getState().setDeviceId('headset')
    store.getState().alignDevice(['built-in'])

    expect(store.getState().deviceId).toBe('default')
    expect(storage.getItem('radcord.mic')).toContain('"deviceId":"default"')
  })

  it('mantém o id quando o aparelho continua conectado', () => {
    const store = createMicPrefsStore(new InMemoryStorage())

    store.getState().setDeviceId('headset')
    store.getState().alignDevice(['headset'])

    expect(store.getState().deviceId).toBe('headset')
  })
})
