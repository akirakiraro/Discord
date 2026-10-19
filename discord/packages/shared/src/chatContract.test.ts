import { describe, expect, it } from 'vitest'
import { createChannelRequestSchema, messageContentSchema, messageHistoryQuerySchema } from './chatContract'

describe('createChannelRequestSchema', () => {
  it('normaliza o nome do canal', () => {
    expect(createChannelRequestSchema.parse({ name: ' Jogos-PC ', kind: 'text' })).toEqual({ name: 'jogos-pc', kind: 'text' })
  })

  it('rejeita tipo de canal desconhecido', () => {
    expect(createChannelRequestSchema.safeParse({ name: 'x', kind: 'video' }).success).toBe(false)
  })
})

describe('messageContentSchema', () => {
  it('rejeita mensagem só com espaços', () => {
    expect(messageContentSchema.safeParse({ content: '   ' }).success).toBe(false)
  })

  it('rejeita mensagem acima de 2000 caracteres', () => {
    expect(messageContentSchema.safeParse({ content: 'a'.repeat(2001) }).success).toBe(false)
  })
})

describe('messageHistoryQuerySchema', () => {
  it('usa 50 como limite padrão e converte texto em número', () => {
    expect(messageHistoryQuerySchema.parse({})).toEqual({ limit: 50 })
    expect(messageHistoryQuerySchema.parse({ limit: '10' })).toEqual({ limit: 10 })
  })

  it('rejeita cursor que não é uuid', () => {
    expect(messageHistoryQuerySchema.safeParse({ before: '123' }).success).toBe(false)
  })
})
