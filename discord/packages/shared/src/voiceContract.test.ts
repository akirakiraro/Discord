import { describe, expect, it } from 'vitest'
import { voiceTokenRequestSchema } from './voiceContract'

describe('voiceTokenRequestSchema', () => {
  it('aceita o id de um canal', () => {
    const channelId = '6f1c2b7e-1d1a-4c55-9b8e-3a2f4d5e6f70'

    expect(voiceTokenRequestSchema.parse({ channelId })).toEqual({ channelId })
  })

  it('rejeita id que não é uuid', () => {
    const result = voiceTokenRequestSchema.safeParse({ channelId: 'geral' })

    expect(result.success, 'nome de sala no lugar do id deveria falhar').toBe(false)
  })
})
