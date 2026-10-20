import { describe, expect, it } from 'vitest'
import { joinRequestSchema } from './authContract'

describe('joinRequestSchema', () => {
  it('normaliza o usuário para minúsculas', () => {
    expect(joinRequestSchema.parse({ username: ' Akira_01 ' })).toEqual({ username: 'akira_01' })
  })

  it.each(['ab', 'nome com espaço', 'a'.repeat(21), 'acentuação'])('rejeita usuário inválido "%s"', (username) => {
    expect(joinRequestSchema.safeParse({ username }).success).toBe(false)
  })
})
