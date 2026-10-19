import { describe, expect, it } from 'vitest'
import { generateSessionToken, hashSessionToken } from './sessionToken'

describe('generateSessionToken', () => {
  it('gera tokens url-safe e únicos', () => {
    const first = generateSessionToken()

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first).not.toBe(generateSessionToken())
  })
})

describe('hashSessionToken', () => {
  it('é determinístico e diferente do token', () => {
    expect(hashSessionToken('abc')).toBe(hashSessionToken('abc'))
    expect(hashSessionToken('abc')).not.toBe('abc')
    expect(hashSessionToken('abc')).toHaveLength(64)
  })
})
