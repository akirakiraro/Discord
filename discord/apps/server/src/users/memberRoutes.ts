import type { FastifyInstance } from 'fastify'
import type { MemberDto } from '@radcord/shared'
import type { AuthService } from '../auth/authService'
import { requireCurrentUser } from '../http/currentUser'
import type { PresenceTracker } from '../realtime/presenceTracker'
import { toUserDto, type UserRepository } from './userRepository'

/**
 * Exemplo: `listMembers(users, presence)` → todos os cadastrados com o status online
 */
export function listMembers(users: UserRepository, presence: PresenceTracker): MemberDto[] {
  return users.listAll().map((user) => ({ ...toUserDto(user), online: presence.isOnline(user.id) }))
}

/**
 * Exemplo: `registerMemberRoutes(app, auth, users, presence)` → GET /members
 */
export function registerMemberRoutes(
  app: FastifyInstance,
  auth: AuthService,
  users: UserRepository,
  presence: PresenceTracker,
): void {
  app.get('/members', async (request): Promise<MemberDto[]> => {
    requireCurrentUser(request, auth)
    return listMembers(users, presence)
  })
}
