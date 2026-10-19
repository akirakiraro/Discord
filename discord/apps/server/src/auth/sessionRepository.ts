import type { DatabaseSync } from 'node:sqlite'

export interface SessionRepository {
  insert(tokenHash: string, userId: string, createdAt: string): void
  findUserId(tokenHash: string): string | undefined
  delete(tokenHash: string): void
}

export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly db: DatabaseSync) {}

  insert(tokenHash: string, userId: string, createdAt: string): void {
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)').run(tokenHash, userId, createdAt)
  }

  findUserId(tokenHash: string): string | undefined {
    const row = this.db.prepare('SELECT user_id FROM sessions WHERE token_hash = ?').get(tokenHash)
    return row ? (row as { user_id: string }).user_id : undefined
  }

  delete(tokenHash: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
  }
}
