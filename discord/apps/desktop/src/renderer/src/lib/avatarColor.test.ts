import { describe, expect, it } from 'vitest'
import { pickAvatarColor } from './avatarColor'

describe('pickAvatarColor', () => {
  it('é determinística para o mesmo nome', () => {
    expect(pickAvatarColor('Akira')).toBe(pickAvatarColor('Akira'))
  })

  it('devolve uma cor hexadecimal da paleta', () => {
    expect(pickAvatarColor('')).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('distribui nomes diferentes em mais de uma cor', () => {
    const names = ['Akira', 'Bruno', 'Caio', 'Duda', 'Edu', 'Fefe', 'Gabi', 'Hugo']
    const colors = new Set(names.map(pickAvatarColor))

    expect(colors.size, 'cores distintas para o grupo de amigos').toBeGreaterThan(1)
  })
})
