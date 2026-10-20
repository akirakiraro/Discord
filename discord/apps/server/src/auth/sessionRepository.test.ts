import { beforeEach, describe, expect, it } from 'vitest'
import { IN_MEMORY_DATABASE, openDatabase } from '../db/database'
import { SqliteUserRepository } from '../users/userRepository'
import { SqliteSessionRepository } from './sessionRepository'

describe('SqliteSessionRepository', () => {
  let sessions: SqliteSessionRepository

  beforeEach(() => {
    const db = openDatabase(IN_MEMORY_DATABASE)
    new SqliteUserRepository(db).insert({
      id: 'u-1',
      username: 'akira',
      displayName: 'Akira',
      createdAt: '2026-10-19T12:00:00.000Z',
    })
    sessions = new SqliteSessionRepository(db)
  })

  it('encontra o usuário pelo hash do token', () => {
    sessions.insert('hash-1', 'u-1', '2026-10-19T12:00:00.000Z')

    expect(sessions.findUserId('hash-1')).toBe('u-1')
  })

  it('não encontra depois de apagar', () => {
    sessions.insert('hash-1', 'u-1', '2026-10-19T12:00:00.000Z')
    sessions.delete('hash-1')

    expect(sessions.findUserId('hash-1')).toBeUndefined()
  })

  it('recusa sessão de usuário inexistente', () => {
    expect(() => sessions.insert('hash-2', 'fantasma', '2026-10-19T12:00:00.000Z')).toThrow(/FOREIGN KEY/)
  })
})
