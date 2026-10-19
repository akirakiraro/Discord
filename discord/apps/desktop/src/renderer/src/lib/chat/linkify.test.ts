import { describe, expect, it } from 'vitest'
import { splitLinks } from './linkify'

describe('splitLinks', () => {
  it('devolve texto puro quando não há link', () => {
    expect(splitLinks('bora jogar')).toEqual([{ kind: 'text', value: 'bora jogar' }])
  })

  it('separa links no meio do texto', () => {
    expect(splitLinks('olha https://store.steampowered.com/app/1 que top')).toEqual([
      { kind: 'text', value: 'olha ' },
      { kind: 'link', value: 'https://store.steampowered.com/app/1' },
      { kind: 'text', value: ' que top' },
    ])
  })

  it('não engole a pontuação do fim da frase', () => {
    expect(splitLinks('vê http://x.com/a.')).toEqual([
      { kind: 'text', value: 'vê ' },
      { kind: 'link', value: 'http://x.com/a' },
      { kind: 'text', value: '.' },
    ])
  })

  it('ignora esquemas que não são http(s)', () => {
    expect(splitLinks('javascript:alert(1)')).toEqual([{ kind: 'text', value: 'javascript:alert(1)' }])
  })
})
