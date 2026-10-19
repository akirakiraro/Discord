import { beforeEach, describe, expect, it } from 'vitest'
import { HttpError } from '../http/httpError'
import {
  InMemorySessionRepository,
  InMemoryUserRepository,
  PlainTextPasswordHasher,
  RecordingBroadcaster,
  fixedClock,
  sequentialIds,
} from '../testing/fakes'
import { AuthService } from './authService'

const AKIRA = { username: 'akira', displayName: 'Akira', password: 'segredo' }

describe('AuthService', () => {
  let auth: AuthService
  let broadcaster: RecordingBroadcaster

  beforeEach(() => {
    broadcaster = new RecordingBroadcaster()
    auth = new AuthService({
      users: new InMemoryUserRepository(),
      sessions: new InMemorySessionRepository(),
      hasher: new PlainTextPasswordHasher(),
      broadcaster,
      clock: fixedClock(),
      newId: sequentialIds('user'),
    })
  })

  it('cadastra, devolve token e avisa os outros membros', async () => {
    const response = await auth.register(AKIRA)

    expect(response.user).toEqual({ id: 'user-1', username: 'akira', displayName: 'Akira', createdAt: '2026-10-19T12:00:00.000Z' })
    expect(response.token.length, 'token não vazio').toBeGreaterThan(20)
    expect(broadcaster.events).toEqual([{ event: 'member:joined', payload: { ...response.user, online: false } }])
  })

  it('recusa username repetido com 409', async () => {
    await auth.register(AKIRA)

    await expect(auth.register(AKIRA)).rejects.toMatchObject({ statusCode: 409, code: 'username_taken' })
  })

  it('faz login com a senha certa e o token autentica o usuário', async () => {
    await auth.register(AKIRA)

    const { token, user } = await auth.login({ username: 'akira', password: 'segredo' })

    expect(auth.authenticate(token)?.id).toBe(user.id)
  })

  it.each([
    ['senha errada', { username: 'akira', password: 'errada' }],
    ['usuário inexistente', { username: 'ninguem', password: 'segredo' }],
  ])('recusa login com %s', async (_case, credentials) => {
    await auth.register(AKIRA)

    const attempt = auth.login(credentials)

    await expect(attempt).rejects.toBeInstanceOf(HttpError)
    await expect(attempt).rejects.toMatchObject({ statusCode: 401 })
  })

  it('não autentica token ausente, desconhecido ou depois do logout', async () => {
    const { token } = await auth.register(AKIRA)
    auth.logout(token)

    expect(auth.authenticate(undefined)).toBeUndefined()
    expect(auth.authenticate('inventado')).toBeUndefined()
    expect(auth.authenticate(token)).toBeUndefined()
  })
})
