import { describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { LATEST_SCHEMA_VERSION, readSchemaVersion, runMigrations } from './migrations'
import { IN_MEMORY_DATABASE, openDatabase } from './database'

function tableNames(db: DatabaseSync): string[] {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as { name: string }[]
  return rows.map((row) => row.name)
}

function columnNames(db: DatabaseSync, table: string): string[] {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return rows.map((row) => row.name)
}

describe('runMigrations', () => {
  it('cria as tabelas e grava a versão mais recente', () => {
    const db = openDatabase(IN_MEMORY_DATABASE)

    expect(readSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION)
    expect(tableNames(db)).toEqual(['channels', 'messages', 'sessions', 'users'])
    expect(columnNames(db, 'users')).not.toContain('password_hash')
  })

  it('é idempotente quando rodada de novo', () => {
    const db = openDatabase(IN_MEMORY_DATABASE)

    expect(() => runMigrations(db), 'segunda execução não deve recriar tabelas').not.toThrow()
    expect(readSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION)
  })
})
