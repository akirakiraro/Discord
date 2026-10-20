import { beforeEach, describe, expect, it } from 'vitest'
import { InMemorySessionRepository, InMemoryUserRepository, RecordingBroadcaster, fixedClock, sequentialIds } from '../testing/fakes'
import { AuthService } from './authService'

const AKIRA = { username: 'akira' }

describe('AuthService', () => {
  let auth: AuthService
  let broadcaster: RecordingBroadcaster
  let users: InMemoryUserRepository

  beforeEach(() => {
    broadcaster = new RecordingBroadcaster()
    users = new InMemoryUserRepository()
    auth = new AuthService({
      users,
      sessions: new InMemorySessionRepository(),
      broadcaster,
      clock: fixedClock(),
      newId: sequentialIds('user'),
    })
  })

  it('cria a conta, devolve token e avisa os outros membros', () => {
    const response = auth.join(AKIRA)

    expect(response.user).toEqual({
      id: 'user-1',
      username: 'akira',
      displayName: 'akira',
      createdAt: '2026-10-19T12:00:00.000Z',
      avatarUrl: null,
    })
    expect(response.token.length, 'token não vazio').toBeGreaterThan(20)
    expect(broadcaster.events).toEqual([{ event: 'member:joined', payload: { ...response.user, online: false } }])
  })

  it('nome que já existe entra como a mesma pessoa, sem criar outra', () => {
    const first = auth.join(AKIRA)

    const second = auth.join(AKIRA)

    expect(second.user.id).toBe(first.user.id)
    expect(users.listAll()).toHaveLength(1)
    expect(broadcaster.events).toHaveLength(1)
    expect(auth.authenticate(second.token)?.id).toBe(first.user.id)
  })

  it('atualiza nome e foto e avisa os conectados', () => {
    const { user } = auth.join(AKIRA)

    const updated = auth.updateProfile(user.id, { displayName: 'Akira', avatarUrl: null })

    expect(updated.displayName).toBe('Akira')
    expect(users.findById(user.id)?.displayName).toBe('Akira')
    expect(broadcaster.events.at(-1)).toEqual({ event: 'member:updated', payload: { ...updated, online: false } })
  })

  it('não autentica token ausente, desconhecido ou depois do logout', () => {
    const { token } = auth.join(AKIRA)
    auth.logout(token)

    expect(auth.authenticate(undefined)).toBeUndefined()
    expect(auth.authenticate('inventado')).toBeUndefined()
    expect(auth.authenticate(token)).toBeUndefined()
  })
})
