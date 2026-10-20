import type { DatabaseSync } from 'node:sqlite'
import type { UserDto } from '@radcord/shared'

export interface UserRecord {
  id: string
  username: string
  displayName: string
  createdAt: string
  avatarUrl?: string | null
}

export interface UserRepository {
  insert(user: UserRecord): void
  findById(id: string): UserRecord | undefined
  findByUsername(username: string): UserRecord | undefined
  listAll(): UserRecord[]
  update(user: UserRecord): void
}

interface UserRow {
  id: string
  username: string
  display_name: string
  created_at: string
  avatar_url: string | null
}

const USER_COLUMNS = 'id, username, display_name, created_at, avatar_url'

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly db: DatabaseSync) {}

  insert(user: UserRecord): void {
    this.db
      .prepare(`INSERT INTO users (${USER_COLUMNS}) VALUES (?, ?, ?, ?, ?)`)
      .run(user.id, user.username, user.displayName, user.createdAt, user.avatarUrl ?? null)
  }

  update(user: UserRecord): void {
    const result = this.db
      .prepare('UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?')
      .run(user.displayName, user.avatarUrl ?? null, user.id)
    if (Number(result.changes) !== 1) throw new Error(`Usuário "${user.id}" não existe para atualizar o perfil`)
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
    createdAt: row.created_at,
    avatarUrl: row.avatar_url,
  }
}

/**
 * Versão pública do usuário, a que a API devolve.
 * Exemplo: `reply.send(toUserDto(user))`
 */
export function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
    avatarUrl: user.avatarUrl ?? null,
  }
}
