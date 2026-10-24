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

  it('mantém a escolha quando o armazenamento não devolve o que gravou', () => {
    const storage: KeyValueStorage = { getItem: () => null, setItem: () => undefined }
    const store = createMicPrefsStore(storage)

    store.getState().setDeviceId('headset')
    store.getState().setGateDb(-30)

    expect(store.getState().deviceId).toBe('headset')
    expect(store.getState().gateDb).toBe(-30)
  })

  it('grava a chave e o volume dos sons da call sem perder o microfone', () => {
    const storage = new InMemoryStorage()
    const store = createMicPrefsStore(storage)

    store.getState().setDeviceId('headset')
    store.getState().setCallSounds(false)
    store.getState().setCallSoundVolume(0.25)

    expect(store.getState()).toMatchObject({ deviceId: 'headset', callSounds: false, callSoundVolume: 0.25 })
    const again = createMicPrefsStore(storage)
    expect(again.getState()).toMatchObject({ deviceId: 'headset', callSounds: false, callSoundVolume: 0.25 })
  })

  it('começa com os sons da call ligados', () => {
    const store = createMicPrefsStore(new InMemoryStorage())

    expect(store.getState().callSounds).toBe(true)
    expect(store.getState().callSoundVolume).toBeGreaterThan(0)
  })

  it('mantém o id quando o aparelho continua conectado', () => {
    const store = createMicPrefsStore(new InMemoryStorage())

    store.getState().setDeviceId('headset')
    store.getState().alignDevice(['headset'])

    expect(store.getState().deviceId).toBe('headset')
  })
})
