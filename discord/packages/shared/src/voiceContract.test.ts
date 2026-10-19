import { describe, expect, it } from 'vitest'
import { voiceTokenRequestSchema } from './voiceContract'

describe('voiceTokenRequestSchema', () => {
  it('aceita nome e sala válidos, removendo espaços', () => {
    const parsed = voiceTokenRequestSchema.parse({ displayName: '  Akira ', roomName: 'geral' })

    expect(parsed).toEqual({ displayName: 'Akira', roomName: 'geral' })
  })

  it('rejeita nome vazio', () => {
    const result = voiceTokenRequestSchema.safeParse({ displayName: '   ', roomName: 'geral' })

    expect(result.success, 'nome só com espaços deveria falhar').toBe(false)
  })

  it('rejeita sala com caracteres fora do padrão', () => {
    const result = voiceTokenRequestSchema.safeParse({ displayName: 'Akira', roomName: 'Sala Geral!' })

    expect(result.success, 'sala com maiúsculas/espaços deveria falhar').toBe(false)
  })
})
