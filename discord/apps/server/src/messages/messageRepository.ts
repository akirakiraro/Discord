import type { DatabaseSync } from 'node:sqlite'
import type { MessageDto } from '@radcord/shared'

export interface MessageRepository {
  insert(message: MessageDto): void
  findById(id: string): MessageDto | undefined
  updateContent(id: string, content: string, editedAt: string): void
  delete(id: string): void
  /** Mensagens mais recentes antes do cursor, em ordem cronológica. */
  listBefore(channelId: string, beforeId: string | undefined, limit: number): MessageDto[]
}

interface MessageRow {
  id: string
  channel_id: string
  author_id: string
  content: string
  created_at: string
  edited_at: string | null
  image_url: string | null
}

const MESSAGE_COLUMNS = 'id, channel_id, author_id, content, created_at, edited_at, image_url'

// O cursor compara (created_at, id) para não pular mensagens criadas no mesmo milissegundo.
const LIST_BEFORE_CURSOR = `
  SELECT ${MESSAGE_COLUMNS} FROM messages
  WHERE channel_id = ? AND (created_at, id) < (SELECT created_at, id FROM messages WHERE id = ?)
  ORDER BY created_at DESC, id DESC LIMIT ?`
const LIST_LATEST = `
  SELECT ${MESSAGE_COLUMNS} FROM messages WHERE channel_id = ?
  ORDER BY created_at DESC, id DESC LIMIT ?`

export class SqliteMessageRepository implements MessageRepository {
  constructor(private readonly db: DatabaseSync) {}

  insert(message: MessageDto): void {
    this.db
      .prepare(`INSERT INTO messages (${MESSAGE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(
        message.id,
        message.channelId,
        message.authorId,
        message.content,
        message.createdAt,
        message.editedAt,
        message.imageUrl ?? null,
      )
  }

  findById(id: string): MessageDto | undefined {
    const row = this.db.prepare(`SELECT ${MESSAGE_COLUMNS} FROM messages WHERE id = ?`).get(id)
    return row ? toMessageDto(row as unknown as MessageRow) : undefined
  }

  updateContent(id: string, content: string, editedAt: string): void {
    this.db.prepare('UPDATE messages SET content = ?, edited_at = ? WHERE id = ?').run(content, editedAt, id)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM messages WHERE id = ?').run(id)
  }

  listBefore(channelId: string, beforeId: string | undefined, limit: number): MessageDto[] {
    const rows = beforeId
      ? this.db.prepare(LIST_BEFORE_CURSOR).all(channelId, beforeId, limit)
      : this.db.prepare(LIST_LATEST).all(channelId, limit)
    return (rows as unknown as MessageRow[]).map(toMessageDto).reverse()
  }
}

function toMessageDto(row: MessageRow): MessageDto {
  return {
    id: row.id,
    channelId: row.channel_id,
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    imageUrl: row.image_url,
  }
}
