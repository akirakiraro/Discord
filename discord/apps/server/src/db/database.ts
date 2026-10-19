import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { runMigrations } from './migrations'

export const IN_MEMORY_DATABASE = ':memory:'

/**
 * Abre (ou cria) o banco SQLite do host e aplica as migrações.
 * Exemplo: `const db = openDatabase('C:/radcord/data/radcord.db')`
 */
export function openDatabase(path: string): DatabaseSync {
  if (path !== IN_MEMORY_DATABASE) mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
  runMigrations(db)
  return db
}
