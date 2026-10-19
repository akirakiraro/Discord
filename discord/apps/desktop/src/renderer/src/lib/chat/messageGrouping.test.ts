import { describe, expect, it } from 'vitest'
import type { MessageDto } from '@radcord/shared'
import { isContinuation } from './messageGrouping'

function message(authorId: string, createdAt: string): MessageDto {
  return { id: createdAt, channelId: 'c', authorId, content: 'x', createdAt, editedAt: null }
}

describe('isContinuation', () => {
  const first = message('u-1', '2026-10-19T12:00:00.000Z')

  it('agrupa o mesmo autor dentro de 5 minutos', () => {
    expect(isContinuation(first, message('u-1', '2026-10-19T12:04:59.000Z'))).toBe(true)
  })

  it('não agrupa depois de 5 minutos', () => {
    expect(isContinuation(first, message('u-1', '2026-10-19T12:05:00.000Z'))).toBe(false)
  })

  it('não agrupa autores diferentes nem a primeira mensagem', () => {
    expect(isContinuation(first, message('u-2', '2026-10-19T12:00:01.000Z'))).toBe(false)
    expect(isContinuation(undefined, first)).toBe(false)
  })
})
