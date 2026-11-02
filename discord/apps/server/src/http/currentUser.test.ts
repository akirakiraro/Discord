import { describe, expect, it } from 'vitest'
import type { AuthService } from '../auth/authService'
import type { UserRecord } from '../users/userRepository'
import { HttpError } from './httpError'
import { readBearerToken, requireCurrentUser } from './currentUser'

describe('readBearerToken', () => {
  it.each([
    ['Bearer abc', 'abc'],
    ['Bearer   abc  ', 'abc'],
    ['Bearer ', undefined],
    ['Basic abc', undefined],
    [undefined, undefined],
  ])('"%s" → %s', (header, expected) => {
    expect(readBearerToken(header)).toBe(expected)
  })
})

describe('requireCurrentUser', () => {
  const user = { id: 'u-1', username: 'akira' } as UserRecord

  it('devolve o dono do Bearer e recusa sessão ausente', () => {
    const auth = {
      authenticate: (token: string | undefined) => (token === 'ok' ? user : undefined),
    } as AuthService

    expect(requireCurrentUser(request('Bearer ok'), auth)).toBe(user)
    expect(() => requireCurrentUser(request(undefined), auth)).toThrow(HttpError)
    expect(() => requireCurrentUser(request('Bearer errado'), auth)).toThrow(HttpError)
    try {
      requireCurrentUser(request(undefined), auth)
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 401, code: 'unauthorized', message: 'Sessão inválida ou expirada; entre de novo' })
    }
  })
})

function request(authorization: string | undefined): Parameters<typeof requireCurrentUser>[0] {
  return { headers: { authorization } } as Parameters<typeof requireCurrentUser>[0]
}
