import type { FastifyRequest } from 'fastify'
import type { AuthService } from '../auth/authService'
import type { UserRecord } from '../users/userRepository'
import { HttpError } from './httpError'

const BEARER_PREFIX = 'Bearer '

/**
 * Extrai o token de um cabeçalho `Authorization: Bearer <token>`.
 * Exemplo: `readBearerToken('Bearer abc')` → `'abc'`
 */
export function readBearerToken(header: string | undefined): string | undefined {
  if (!header?.startsWith(BEARER_PREFIX)) return undefined
  return header.slice(BEARER_PREFIX.length).trim() || undefined
}

/**
 * Usuário dono da sessão da requisição; lança 401 quando não há sessão válida.
 * Exemplo: `const user = requireCurrentUser(request, auth)`
 */
export function requireCurrentUser(request: FastifyRequest, auth: AuthService): UserRecord {
  const user = auth.authenticate(readBearerToken(request.headers.authorization))
  if (!user) {
    throw new HttpError(401, 'unauthorized', 'Sessão inválida ou expirada; entre de novo')
  }
  return user
}
