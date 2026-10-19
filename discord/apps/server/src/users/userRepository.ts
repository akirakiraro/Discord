import type { DatabaseSync } from 'node:sqlite'
import type { UserDto } from '@radcord/shared'

export interface UserRecord {
  id: string
  username: string
  displayName: string
  passwordHash: string
  createdAt: string
}

export interface UserRepository {
  insert(user: UserRecord): void
  findById(id: string): UserRecord | undefined
  findByUsername(username: string): UserRecord | undefined
  listAll(): UserRecord[]
}

interface UserRow {
  id: string
  username: string
  display_name: string
  password_hash: string
  created_at: string
}

const USER_COLUMNS = 'id, username, display_name, password_hash, created_at'

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: DatabaseSync) {}

  insert(user: UserRecord): void {
    this.db
      .prepare(`INSERT INTO users (${USER_COLUMNS}) VALUES (?, ?, ?, ?, ?)`)
      .run(user.id, user.username, user.displayName, user.passwordHash, user.createdAt)
  }

  findById(id: string): UserRecord | undefined {
    const row = this.db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(id)
    return row ? toUserRecord(row as unknown as UserRow) : undefined
  }

  findByUsername(username: string): UserRecord | undefined {
    const row = this.db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE username = ?`).get(username)
    return row ? toUserRecord(row as unknown as UserRow) : undefined
  }

  listAll(): UserRecord[] {
    const rows = this.db.prepare(`SELECT ${USER_COLUMNS} FROM users ORDER BY display_name`).all()
    return (rows as unknown as UserRow[]).map(toUserRecord)
  }
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  }
}

/**
 * Versão pública do usuário, sem o hash da senha.
 * Exemplo: `reply.send(toUserDto(user))`
 */
export function toUserDto(user: UserRecord): UserDto {
  return { id: user.id, username: user.username, displayName: user.displayName, createdAt: user.createdAt }
}
