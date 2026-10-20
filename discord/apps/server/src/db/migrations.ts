import type { DatabaseSync } from 'node:sqlite'

// Nunca editar uma migração já publicada: cada amigo que hospeda tem um banco
// com `user_version` gravado. Para mudar o esquema, adicione uma nova no fim.
const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );
  CREATE TABLE channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('text', 'voice')),
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (name, kind)
  );
  CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    edited_at TEXT
  );
  CREATE INDEX messages_by_channel_time ON messages (channel_id, created_at, id);
  `,
  `ALTER TABLE users DROP COLUMN password_hash;`,
  `ALTER TABLE users ADD COLUMN avatar_url TEXT;`,
  `ALTER TABLE messages ADD COLUMN image_url TEXT;`,
]

/**
 * Aplica as migrações pendentes, usando `PRAGMA user_version` como versão do esquema.
 * Exemplo: `runMigrations(new DatabaseSync('radcord.db'))`
 */
export function runMigrations(db: DatabaseSync): void {
  const currentVersion = readSchemaVersion(db)
  MIGRATIONS.slice(currentVersion).forEach((sql, offset) => {
    db.exec('BEGIN')
    db.exec(sql)
    db.exec(`PRAGMA user_version = ${currentVersion + offset + 1}`)
    db.exec('COMMIT')
  })
}

export function readSchemaVersion(db: DatabaseSync): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number }
  return row.user_version
}

export const LATEST_SCHEMA_VERSION = MIGRATIONS.length
