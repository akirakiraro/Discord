import type { DatabaseSync } from 'node:sqlite'
import type { ChannelDto, ChannelKind } from '@radcord/shared'

export interface ChannelRecord extends ChannelDto {
  createdAt: string
}

export interface ChannelRepository {
  insert(channel: ChannelRecord): void
  findById(id: string): ChannelRecord | undefined
  findByName(name: string, kind: ChannelKind): ChannelRecord | undefined
  listAll(): ChannelRecord[]
  nextPosition(kind: ChannelKind): number
}

interface ChannelRow {
  id: string
  name: string
  kind: ChannelKind
  position: number
  created_at: string
}

const CHANNEL_COLUMNS = 'id, name, kind, position, created_at'

export class SqliteChannelRepository implements ChannelRepository {
  constructor(private readonly db: DatabaseSync) {}

  insert(channel: ChannelRecord): void {
    this.db
      .prepare(`INSERT INTO channels (${CHANNEL_COLUMNS}) VALUES (?, ?, ?, ?, ?)`)
      .run(channel.id, channel.name, channel.kind, channel.position, channel.createdAt)
  }

  findById(id: string): ChannelRecord | undefined {
    const row = this.db.prepare(`SELECT ${CHANNEL_COLUMNS} FROM channels WHERE id = ?`).get(id)
    return row ? toChannelRecord(row as unknown as ChannelRow) : undefined
  }

  findByName(name: string, kind: ChannelKind): ChannelRecord | undefined {
    const row = this.db.prepare(`SELECT ${CHANNEL_COLUMNS} FROM channels WHERE name = ? AND kind = ?`).get(name, kind)
    return row ? toChannelRecord(row as unknown as ChannelRow) : undefined
  }

  listAll(): ChannelRecord[] {
    const rows = this.db.prepare(`SELECT ${CHANNEL_COLUMNS} FROM channels ORDER BY kind, position`).all()
    return (rows as unknown as ChannelRow[]).map(toChannelRecord)
  }

  nextPosition(kind: ChannelKind): number {
    const row = this.db.prepare('SELECT COALESCE(MAX(position) + 1, 0) AS next FROM channels WHERE kind = ?').get(kind)
    return (row as { next: number }).next
  }
}

function toChannelRecord(row: ChannelRow): ChannelRecord {
  return { id: row.id, name: row.name, kind: row.kind, position: row.position, createdAt: row.created_at }
}

export function toChannelDto(channel: ChannelRecord): ChannelDto {
  return { id: channel.id, name: channel.name, kind: channel.kind, position: channel.position }
}
