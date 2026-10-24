import { describe, expect, it } from 'vitest'
import {
  appReleasePayloadSchema,
  compareReleaseVersions,
  isNewerRelease,
  knownReleasePayload,
  normalizeReleaseVersion,
} from './releaseContract'

describe('normalizeReleaseVersion', () => {
  it('aceita a tag do GitHub e a versão do package.json', () => {
    expect(normalizeReleaseVersion('v0.1.117')).toBe('0.1.117')
    expect(normalizeReleaseVersion(' 0.1.117 ')).toBe('0.1.117')
  })

  it('recusa pre-release e texto vazio', () => {
    expect(normalizeReleaseVersion('0.1.117-beta')).toBeNull()
    expect(normalizeReleaseVersion('')).toBeNull()
  })
})

describe('compareReleaseVersions', () => {
  it('compara o patch como número', () => {
    expect(compareReleaseVersions('0.1.10', '0.1.9'), '10 é maior que 9').toBe(1)
    expect(compareReleaseVersions('v0.1.9', '0.1.10')).toBe(-1)
    expect(compareReleaseVersions('0.1.116', 'v0.1.116')).toBe(0)
  })

  it('sobe o minor antes do patch', () => {
    expect(compareReleaseVersions('0.2.0', '0.1.999')).toBe(1)
  })

  it('mostra o valor quando a versão não é 0.1.N', () => {
    expect(() => compareReleaseVersions('latest', '0.1.1')).toThrow(/"latest"/)
  })
})

describe('isNewerRelease', () => {
  it('só é verdade quando a candidata é maior', () => {
    expect(isNewerRelease('v0.1.117', '0.1.116')).toBe(true)
    expect(isNewerRelease('0.1.116', '0.1.116')).toBe(false)
    expect(isNewerRelease('0.1.115', 'v0.1.116')).toBe(false)
  })

  it('ignora versão ilegível em vez de tratar como mais nova', () => {
    expect(isNewerRelease('beta', '0.1.116')).toBe(false)
    expect(isNewerRelease('0.1.117', 'dev')).toBe(false)
  })
})

describe('knownReleasePayload', () => {
  it('normaliza a tag para o contrato do socket', () => {
    expect(knownReleasePayload('v0.1.4')).toEqual({ version: '0.1.4' })
    expect(appReleasePayloadSchema.parse(knownReleasePayload('v0.1.4'))).toEqual({ version: '0.1.4' })
  })

  it('não emite quando o host ainda não viu uma release', () => {
    expect(knownReleasePayload(null)).toBeNull()
    expect(knownReleasePayload('nightly')).toBeNull()
  })
})
