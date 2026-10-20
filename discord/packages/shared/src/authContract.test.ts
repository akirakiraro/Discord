import { describe, expect, it } from 'vitest'
import { joinRequestSchema, profileUpdateSchema } from './authContract'

describe('joinRequestSchema', () => {
  it('normaliza o usuário para minúsculas', () => {
    expect(joinRequestSchema.parse({ username: ' Akira_01 ' })).toEqual({ username: 'akira_01' })
  })

  it.each(['ab', 'nome com espaço', 'a'.repeat(21), 'acentuação'])('rejeita usuário inválido "%s"', (username) => {
    expect(joinRequestSchema.safeParse({ username }).success).toBe(false)
  })
})

describe('profileUpdateSchema', () => {
  it('aceita nome e foto jpeg, ou foto removida', () => {
    expect(profileUpdateSchema.parse({ displayName: ' Akira ', avatarUrl: null })).toEqual({
      displayName: 'Akira',
      avatarUrl: null,
    })
    expect(profileUpdateSchema.safeParse({ displayName: 'Akira', avatarUrl: 'data:image/jpeg;base64,YQ==' }).success).toBe(true)
  })

  it('rejeita nome vazio e foto que não é jpeg', () => {
    expect(profileUpdateSchema.safeParse({ displayName: '  ', avatarUrl: null }).success).toBe(false)
    expect(profileUpdateSchema.safeParse({ displayName: 'Akira', avatarUrl: 'https://x' }).success).toBe(false)
  })
})
