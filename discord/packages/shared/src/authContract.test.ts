import { describe, expect, it } from 'vitest'
import { loginRequestSchema, registerRequestSchema } from './authContract'

describe('registerRequestSchema', () => {
  it('normaliza o usuário para minúsculas e tira espaços do nome', () => {
    const parsed = registerRequestSchema.parse({ username: ' Akira_01 ', displayName: ' Akira ', password: 'segredo' })

    expect(parsed).toEqual({ username: 'akira_01', displayName: 'Akira', password: 'segredo' })
  })

  it.each(['ab', 'nome com espaço', 'a'.repeat(21), 'acentuação'])('rejeita usuário inválido "%s"', (username) => {
    const result = registerRequestSchema.safeParse({ username, displayName: 'X', password: 'segredo' })

    expect(result.success).toBe(false)
  })

  it('rejeita senha curta', () => {
    const result = registerRequestSchema.safeParse({ username: 'akira', displayName: 'Akira', password: '123' })

    expect(result.success).toBe(false)
  })
})

describe('loginRequestSchema', () => {
  it('aceita qualquer senha não vazia', () => {
    expect(loginRequestSchema.parse({ username: 'AKIRA', password: 'x' })).toEqual({ username: 'akira', password: 'x' })
  })
})
