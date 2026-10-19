import type { PasswordHasher } from '../auth/passwordHasher'
import type { SessionRepository } from '../auth/sessionRepository'
import type { Clock, IdGenerator } from '../platform/runtime'
import type { RealtimeBroadcaster, ServerEventName, ServerEventPayload } from '../realtime/realtimeBroadcaster'
import type { UserRecord, UserRepository } from '../users/userRepository'

export interface RecordedEvent {
  event: ServerEventName
  payload: unknown
}

export class RecordingBroadcaster implements RealtimeBroadcaster {
  readonly events: RecordedEvent[] = []

  emit<E extends ServerEventName>(event: E, payload: ServerEventPayload<E>): void {
    this.events.push({ event, payload })
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserRecord>()

  insert(user: UserRecord): void {
    this.users.set(user.id, user)
  }

  findById(id: string): UserRecord | undefined {
    return this.users.get(id)
  }

  findByUsername(username: string): UserRecord | undefined {
    return [...this.users.values()].find((user) => user.username === username)
  }

  listAll(): UserRecord[] {
    return [...this.users.values()]
  }
}

export class InMemorySessionRepository implements SessionRepository {
  readonly sessions = new Map<string, string>()

  insert(tokenHash: string, userId: string): void {
    this.sessions.set(tokenHash, userId)
  }

  findUserId(tokenHash: string): string | undefined {
    return this.sessions.get(tokenHash)
  }

  delete(tokenHash: string): void {
    this.sessions.delete(tokenHash)
  }
}

/** Hash reversível e instantâneo: os testes de serviço não precisam pagar o custo do scrypt. */
export class PlainTextPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `plain:${password}`
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    return storedHash === `plain:${password}`
  }
}

export function fixedClock(iso: string = '2026-10-19T12:00:00.000Z'): Clock {
  return () => new Date(iso)
}

export function sequentialIds(prefix: string = 'id'): IdGenerator {
  let counter = 0
  return () => `${prefix}-${++counter}`
}
