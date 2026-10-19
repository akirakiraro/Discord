import type { FastifyInstance } from 'fastify'
import { loginRequestSchema, registerRequestSchema, type AuthResponse, type UserDto } from '@radcord/shared'
import { readBearerToken, requireCurrentUser } from '../http/currentUser'
import { parseRequest } from '../http/httpError'
import { toUserDto } from '../users/userRepository'
import type { AuthService } from './authService'

/**
 * Exemplo: `registerAuthRoutes(app, auth)` → POST /auth/register, POST /auth/login, GET /auth/me, POST /auth/logout
 */
export function registerAuthRoutes(app: FastifyInstance, auth: AuthService): void {
  app.post('/auth/register', async (request, reply): Promise<AuthResponse> => {
    const response = await auth.register(parseRequest(registerRequestSchema, request.body))
    reply.code(201)
    return response
  })

  app.post('/auth/login', async (request): Promise<AuthResponse> => auth.login(parseRequest(loginRequestSchema, request.body)))

  app.get('/auth/me', async (request): Promise<UserDto> => toUserDto(requireCurrentUser(request, auth)))

  app.post('/auth/logout', async (request, reply) => {
    requireCurrentUser(request, auth)
    auth.logout(readBearerToken(request.headers.authorization) ?? '')
    return reply.code(204).send()
  })
}
