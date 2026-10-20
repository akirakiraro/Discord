import type { AuthResponse, JoinRequest } from '@radcord/shared'
import type { Clock, IdGenerator } from '../platform/runtime'
import type { RealtimeBroadcaster } from '../realtime/realtimeBroadcaster'
import { toUserDto, type UserRecord, type UserRepository } from '../users/userRepository'
import type { SessionRepository } from './sessionRepository'
import { generateSessionToken, hashSessionToken } from './sessionToken'

export interface AuthServiceDependencies {
  users: UserRepository
  sessions: SessionRepository
  broadcaster: RealtimeBroadcaster
  clock: Clock
  newId: IdGenerator
}

/**
 * Entrada por nome: reabre quem já existe ou cria a conta na hora.
 * Exemplo: `const { token } = auth.join({ username: 'akira' })`
 */
export class AuthService {
  constructor(private readonly deps: AuthServiceDependencies) {}

  join(request: JoinRequest): AuthResponse {
    const existing = this.deps.users.findByUsername(request.username)
    if (existing) return this.openSession(existing)
    const user: UserRecord = {
      id: this.deps.newId(),
      username: request.username,
      displayName: request.username,
      createdAt: this.deps.clock().toISOString(),
    }
    this.deps.users.insert(user)
    this.deps.broadcaster.emit('member:joined', { ...toUserDto(user), online: false })
    return this.openSession(user)
  }

  authenticate(token: string | undefined): UserRecord | undefined {
    if (!token) return undefined
    const userId = this.deps.sessions.findUserId(hashSessionToken(token))
    return userId ? this.deps.users.findById(userId) : undefined
  }

  logout(token: string): void {
    this.deps.sessions.delete(hashSessionToken(token))
  }

  private openSession(user: UserRecord): AuthResponse {
    const token = generateSessionToken()
    this.deps.sessions.insert(hashSessionToken(token), user.id, this.deps.clock().toISOString())
    return { token, user: toUserDto(user) }
  }
}
