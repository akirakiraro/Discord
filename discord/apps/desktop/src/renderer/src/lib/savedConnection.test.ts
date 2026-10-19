import { describe, expect, it } from 'vitest'
import { loadSavedConnection, saveConnection, type KeyValueStorage } from './savedConnection'

class InMemoryStorage implements KeyValueStorage {
  private readonly entries = new Map<string, string>()

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value)
  }
}

describe('savedConnection', () => {
  it('devolve campos vazios quando nada foi salvo', () => {
    expect(loadSavedConnection(new InMemoryStorage())).toEqual({ hostAddress: '', displayName: '' })
  })

  it('lê de volta o que foi salvo', () => {
    const storage = new InMemoryStorage()

    saveConnection(storage, { hostAddress: '26.186.21.58', displayName: 'Akira' })

    expect(loadSavedConnection(storage)).toEqual({ hostAddress: '26.186.21.58', displayName: 'Akira' })
  })

  it('ignora conteúdo corrompido', () => {
    const storage = new InMemoryStorage()
    storage.setItem('radcord.connection', '{nao-e-json')

    expect(loadSavedConnection(storage)).toEqual({ hostAddress: '', displayName: '' })
  })
})
