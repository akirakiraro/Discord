import { describe, expect, it } from 'vitest'
import { monitorIdentity, voiceJoinPayloadSchema, voiceTokenRequestSchema } from './voiceContract'

describe('voiceTokenRequestSchema', () => {
  it('aceita o id de um canal', () => {
    const channelId = '6f1c2b7e-1d1a-4c55-9b8e-3a2f4d5e6f70'

    expect(voiceTokenRequestSchema.parse({ channelId })).toEqual({ channelId })
  })

  it('aceita o pedido de escuta pelo servidor', () => {
    const channelId = '6f1c2b7e-1d1a-4c55-9b8e-3a2f4d5e6f70'

    expect(voiceTokenRequestSchema.parse({ channelId, monitor: true })).toEqual({ channelId, monitor: true })
  })

  it('rejeita id que não é uuid', () => {
    const result = voiceTokenRequestSchema.safeParse({ channelId: 'geral' })

    expect(result.success, 'nome de sala no lugar do id deveria falhar').toBe(false)
  })
})

describe('voiceJoinPayloadSchema', () => {
  it('aceita o id do canal de voz', () => {
    const channelId = '6f1c2b7e-1d1a-4c55-9b8e-3a2f4d5e6f70'

    expect(voiceJoinPayloadSchema.parse({ channelId })).toEqual({ channelId })
  })

  it('rejeita nome de canal no lugar do id', () => {
    expect(voiceJoinPayloadSchema.safeParse({ channelId: 'geral' }).success).toBe(false)
  })
})

describe('monitorIdentity', () => {
  it('separa a escuta da conexão que publica', () => {
    expect(monitorIdentity('user-1')).toBe('user-1:monitor')
  })

  it('recusa id vazio', () => {
    expect(() => monitorIdentity('')).toThrow(/userId ""/)
  })
})
