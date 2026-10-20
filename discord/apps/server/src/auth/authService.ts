import type { AuthResponse, JoinRequest, ProfileUpdate, UserDto } from '@radcord/shared'
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

  /**
   * Grava nome e foto e avisa quem está conectado.
   * Exemplo: `auth.updateProfile(user.id, { displayName: 'Akira', avatarUrl: null })`
   */
  updateProfile(userId: string, patch: ProfileUpdate): UserDto {
    const current = this.deps.users.findById(userId)
    if (!current) throw new Error(`Usuário "${userId}" não existe para atualizar o perfil`)
    const next: UserRecord = { ...current, displayName: patch.displayName, avatarUrl: patch.avatarUrl }
    this.deps.users.update(next)
    const dto = toUserDto(next)
    this.deps.broadcaster.emit('member:updated', { ...dto, online: false })
    return dto
  }

  private openSession(user: UserRecord): AuthResponse {
    const token = generateSessionToken()
    this.deps.sessions.insert(hashSessionToken(token), user.id, this.deps.clock().toISOString())
    return { token, user: toUserDto(user) }
  }
}
