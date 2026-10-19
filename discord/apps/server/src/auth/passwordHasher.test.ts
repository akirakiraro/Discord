import { describe, expect, it } from 'vitest'
import { ScryptPasswordHasher } from './passwordHasher'

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher()

  it('confirma a senha correta', async () => {
    const stored = await hasher.hash('segredo123')

    expect(await hasher.verify('segredo123', stored)).toBe(true)
  })

  it('recusa senha errada', async () => {
    const stored = await hasher.hash('segredo123')

    expect(await hasher.verify('outra', stored)).toBe(false)
  })

  it('gera hashes diferentes para a mesma senha (salt aleatório)', async () => {
    expect(await hasher.hash('igual')).not.toBe(await hasher.hash('igual'))
  })

  it('recusa hash em formato desconhecido', async () => {
    expect(await hasher.verify('x', 'bcrypt$abc')).toBe(false)
  })
})
