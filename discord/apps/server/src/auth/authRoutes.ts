import type { FastifyInstance } from 'fastify'
import { joinRequestSchema, type AuthResponse, type UserDto } from '@radcord/shared'
import { readBearerToken, requireCurrentUser } from '../http/currentUser'
import { parseRequest } from '../http/httpError'
import { toUserDto } from '../users/userRepository'
import type { AuthService } from './authService'

/**
 * Exemplo: `registerAuthRoutes(app, auth)` → POST /auth/join, GET /auth/me, POST /auth/logout
 */
export function registerAuthRoutes(app: FastifyInstance, auth: AuthService): void {
  app.post('/auth/join', async (request): Promise<AuthResponse> => auth.join(parseRequest(joinRequestSchema, request.body)))

  app.get('/auth/me', async (request): Promise<UserDto> => toUserDto(requireCurrentUser(request, auth)))

  app.post('/auth/logout', async (request, reply) => {
    requireCurrentUser(request, auth)
    auth.logout(readBearerToken(request.headers.authorization) ?? '')
    return reply.code(204).send()
  })
}
