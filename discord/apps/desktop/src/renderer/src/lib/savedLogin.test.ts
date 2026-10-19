import { describe, expect, it } from 'vitest'
import { forgetLoginToken, loadSavedLogin, saveLogin, type KeyValueStorage } from './savedLogin'

class InMemoryStorage implements KeyValueStorage {
  private readonly entries = new Map<string, string>()

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value)
  }
}

const AKIRA_LOGIN = { hostAddress: '26.186.21.58', username: 'akira', token: 'tok' }

describe('savedLogin', () => {
  it('devolve vazio quando nada foi salvo', () => {
    expect(loadSavedLogin(new InMemoryStorage())).toEqual({ hostAddress: '', username: '', token: null })
  })

  it('lê de volta o que foi salvo', () => {
    const storage = new InMemoryStorage()

    saveLogin(storage, AKIRA_LOGIN)

    expect(loadSavedLogin(storage)).toEqual(AKIRA_LOGIN)
  })

  it('forgetLoginToken mantém host e usuário', () => {
    const storage = new InMemoryStorage()
    saveLogin(storage, AKIRA_LOGIN)

    forgetLoginToken(storage)

    expect(loadSavedLogin(storage)).toEqual({ ...AKIRA_LOGIN, token: null })
  })

  it('ignora conteúdo corrompido ou token com tipo errado', () => {
    const storage = new InMemoryStorage()
    storage.setItem('radcord.login', '{"hostAddress":"x","token":123}')

    expect(loadSavedLogin(storage)).toEqual({ hostAddress: 'x', username: '', token: null })

    storage.setItem('radcord.login', '{quebrado')
    expect(loadSavedLogin(storage).hostAddress).toBe('')
  })
})
