import { describe, expect, it } from 'vitest'
import { desktopUpdateManifestSchema, isNewerDesktopVersion } from './desktopUpdateContract'

const MANIFEST = {
  version: '0.1.37',
  sha256: 'a'.repeat(64),
  size: 12,
}

describe('isNewerDesktopVersion', () => {
  it('reconhece patch, minor e major mais novos', () => {
    expect(isNewerDesktopVersion('0.1.36', '0.1.37'), 'patch').toBe(true)
    expect(isNewerDesktopVersion('0.1.99', '0.2.0'), 'minor').toBe(true)
    expect(isNewerDesktopVersion('0.9.9', '1.0.0'), 'major').toBe(true)
  })

  it('recusa a mesma versão e uma versão antiga', () => {
    expect(isNewerDesktopVersion('0.1.37', '0.1.37'), 'igual').toBe(false)
    expect(isNewerDesktopVersion('0.1.37', '0.1.36'), 'antiga').toBe(false)
  })

  it('cita o valor quando a versão não tem três números', () => {
    expect(() => isNewerDesktopVersion('0.1', '0.1.2')).toThrow(/"0.1"/)
  })
})

describe('desktopUpdateManifestSchema', () => {
  it('aceita o manifesto publicado pelo host', () => {
    expect(desktopUpdateManifestSchema.parse(MANIFEST)).toEqual(MANIFEST)
  })

  it('recusa hash curto e tamanho que não é inteiro', () => {
    expect(desktopUpdateManifestSchema.safeParse({ ...MANIFEST, sha256: 'abc' }).success).toBe(false)
    expect(desktopUpdateManifestSchema.safeParse({ ...MANIFEST, size: 1.5 }).success).toBe(false)
  })
})
