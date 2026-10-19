import type { AuthResponse, LoginRequest, RegisterRequest } from '@radcord/shared'
import { HttpError } from '../http/httpError'
import type { Clock, IdGenerator } from '../platform/runtime'
import type { RealtimeBroadcaster } from '../realtime/realtimeBroadcaster'
import { toUserDto, type UserRecord, type UserRepository } from '../users/userRepository'
import type { PasswordHasher } from './passwordHasher'
import type { SessionRepository } from './sessionRepository'
import { generateSessionToken, hashSessionToken } from './sessionToken'

export interface AuthServiceDependencies {
  users: UserRepository
  sessions: SessionRepository
  hasher: PasswordHasher
  broadcaster: RealtimeBroadcaster
  clock: Clock
  newId: IdGenerator
}

/**
 * Cadastro, login e validação de sessão.
 * Exemplo: `const { token } = await auth.login({ username: 'akira', password: 'segredo' })`
 */
export class AuthService {
  constructor(private readonly deps: AuthServiceDependencies) {}

  async register(request: RegisterRequest): Promise<AuthResponse> {
    if (this.deps.users.findByUsername(request.username)) {
      throw new HttpError(409, 'username_taken', `O usuário "${request.username}" já existe; escolha outro`)
    }
    const user: UserRecord = {
      id: this.deps.newId(),
      username: request.username,
      displayName: request.displayName,
      passwordHash: await this.deps.hasher.hash(request.password),
      createdAt: this.deps.clock().toISOString(),
    }
    this.deps.users.insert(user)
    this.deps.broadcaster.emit('member:joined', { ...toUserDto(user), online: false })
    return this.openSession(user)
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const user = this.deps.users.findByUsername(request.username)
    const passwordMatches = user ? await this.deps.hasher.verify(request.password, user.passwordHash) : false
    if (!user || !passwordMatches) {
      throw new HttpError(401, 'invalid_credentials', `Usuário "${request.username}" ou senha incorretos`)
    }
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
