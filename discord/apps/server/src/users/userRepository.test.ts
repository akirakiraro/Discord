import { beforeEach, describe, expect, it } from 'vitest'
import { IN_MEMORY_DATABASE, openDatabase } from '../db/database'
import { SqliteUserRepository, toUserDto, type UserRecord } from './userRepository'

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'u-1',
    username: 'akira',
    displayName: 'Akira',
    createdAt: '2026-10-19T12:00:00.000Z',
    ...overrides,
  }
}

describe('SqliteUserRepository', () => {
  let users: SqliteUserRepository

  beforeEach(() => {
    users = new SqliteUserRepository(openDatabase(IN_MEMORY_DATABASE))
  })

  it('grava e encontra por id e por username', () => {
    const user = buildUser()
    users.insert(user)

    expect(users.findById('u-1')).toEqual(user)
    expect(users.findByUsername('akira')).toEqual(user)
  })

  it('devolve undefined quando não existe', () => {
    expect(users.findById('nada')).toBeUndefined()
    expect(users.findByUsername('nada')).toBeUndefined()
  })

  it('impede username duplicado', () => {
    users.insert(buildUser())

    expect(() => users.insert(buildUser({ id: 'u-2' }))).toThrow(/UNIQUE/)
  })

  it('lista todos ordenados pelo nome de exibição', () => {
    users.insert(buildUser({ id: 'u-1', username: 'zeca', displayName: 'Zeca' }))
    users.insert(buildUser({ id: 'u-2', username: 'ana', displayName: 'Ana' }))

    expect(users.listAll().map((user) => user.displayName)).toEqual(['Ana', 'Zeca'])
  })

  it('atualiza nome e foto de quem já existe', () => {
    users.insert(buildUser())
    users.update({ ...buildUser(), displayName: 'Akira K', avatarUrl: 'data:image/jpeg;base64,YQ==' })

    expect(users.findById('u-1')?.displayName).toBe('Akira K')
    expect(users.findById('u-1')?.avatarUrl).toBe('data:image/jpeg;base64,YQ==')
  })
})

describe('toUserDto', () => {
  it('expõe id, usuário, nome, data e foto', () => {
    expect(toUserDto(buildUser())).toEqual({
      id: 'u-1',
      username: 'akira',
      displayName: 'Akira',
      createdAt: '2026-10-19T12:00:00.000Z',
      avatarUrl: null,
    })
  })
})
