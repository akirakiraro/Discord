import { describe, expect, it } from 'vitest'
import { jwtSubject } from './serverEar'

function fakeJwt(sub: string): string {
  const payload = btoa(JSON.stringify({ sub })).replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${payload}.sig`
}

describe('jwtSubject', () => {
  it('lê a identidade do payload', () => {
    expect(jwtSubject(fakeJwt('user-1:monitor'))).toBe('user-1:monitor')
  })

  it('recusa token sem as três partes', () => {
    expect(() => jwtSubject('sem-ponto')).toThrow(/sem payload/)
  })
})
