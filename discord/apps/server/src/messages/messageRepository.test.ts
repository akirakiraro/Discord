import { beforeEach, describe, expect, it } from 'vitest'
import type { MessageDto } from '@radcord/shared'
import { SqliteChannelRepository } from '../channels/channelRepository'
import { IN_MEMORY_DATABASE, openDatabase } from '../db/database'
import { SqliteUserRepository } from '../users/userRepository'
import { SqliteMessageRepository } from './messageRepository'

const BULK_MESSAGE_COUNT = 60

function buildMessage(index: number, overrides: Partial<MessageDto> = {}): MessageDto {
  const second = String(index % 60).padStart(2, '0')
  const minute = String(Math.floor(index / 60)).padStart(2, '0')
  return {
    id: `m-${String(index).padStart(3, '0')}`,
    channelId: 'c-1',
    authorId: 'u-1',
    content: `mensagem ${index}`,
    createdAt: `2026-10-19T12:${minute}:${second}.000Z`,
    editedAt: null,
    ...overrides,
  }
}

describe('SqliteMessageRepository', () => {
  let messages: SqliteMessageRepository

  beforeEach(() => {
    const db = openDatabase(IN_MEMORY_DATABASE)
    new SqliteUserRepository(db).insert({ id: 'u-1', username: 'akira', displayName: 'Akira', createdAt: 'x' })
    new SqliteChannelRepository(db).insert({ id: 'c-1', name: 'geral', kind: 'text', position: 0, createdAt: 'x' })
    messages = new SqliteMessageRepository(db)
    for (let index = 0; index < BULK_MESSAGE_COUNT; index++) messages.insert(buildMessage(index))
  })

  it('lista as mais recentes em ordem cronológica', () => {
    const page = messages.listBefore('c-1', undefined, 50)

    expect(page).toHaveLength(50)
    expect(page[0]?.id, 'primeira da página').toBe('m-010')
    expect(page.at(-1)?.id, 'última é a mais nova').toBe('m-059')
  })

  it('pagina para trás a partir do cursor sem repetir nem pular', () => {
    const olderPage = messages.listBefore('c-1', 'm-010', 50)

    expect(olderPage.map((message) => message.id)).toEqual(
      Array.from({ length: 10 }, (_unused, index) => `m-${String(index).padStart(3, '0')}`),
    )
  })

  it('desempata pelo id quando o horário é igual', () => {
    messages.insert(buildMessage(900, { id: 'm-zzz', createdAt: '2026-10-19T13:00:00.000Z' }))
    messages.insert(buildMessage(901, { id: 'm-aaa', createdAt: '2026-10-19T13:00:00.000Z' }))

    expect(messages.listBefore('c-1', 'm-zzz', 1).map((message) => message.id)).toEqual(['m-aaa'])
  })

  it('edita e apaga', () => {
    messages.updateContent('m-001', 'editada', '2026-10-19T14:00:00.000Z')
    messages.delete('m-002')

    expect(messages.findById('m-001')).toMatchObject({ content: 'editada', editedAt: '2026-10-19T14:00:00.000Z' })
    expect(messages.findById('m-002')).toBeUndefined()
  })
})
