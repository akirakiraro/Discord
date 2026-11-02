import { describe, expect, it } from 'vitest'
import { buildHostBaseUrl } from './hostAddress'

describe('buildHostBaseUrl', () => {
  it('usa a porta 3000 quando só o IP é informado', () => {
    expect(buildHostBaseUrl('26.186.21.58')).toBe('http://26.186.21.58:3000')
  })

  it('respeita a porta informada e ignora espaços', () => {
    expect(buildHostBaseUrl('  26.186.21.58:4000 ')).toBe('http://26.186.21.58:4000')
  })

  it('aceita localhost para testar sozinho', () => {
    expect(buildHostBaseUrl('localhost')).toBe('http://localhost:3000')
  })

  it.each([
    ['http://26.1.1.1', /"http:\/\/26\.1\.1\.1"/],
    ['26.186.21.58:99999', /"99999"/],
    ['   ', /inválido/],
  ] as const)('rejeita "%s"', (input, pattern) => {
    expect(() => buildHostBaseUrl(input)).toThrow(pattern)
  })
})
