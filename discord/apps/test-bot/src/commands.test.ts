import { describe, expect, it } from 'vitest'
import { parseBotArgs } from './args'
import { parseCommand } from './commands'

describe('comandos do bot', () => {
  it('tom, wav com espaço no caminho, loop, parar e sair', () => {
    expect(parseCommand('tom')).toEqual({ kind: 'tone', loop: false })
    expect(parseCommand(' tom loop ')).toEqual({ kind: 'tone', loop: true })
    expect(parseCommand('wav C:\\Users\\Akira\\Meus Sons\\fala.wav')).toEqual({ kind: 'wav', path: 'C:\\Users\\Akira\\Meus Sons\\fala.wav', loop: false })
    expect(parseCommand('wav loop "C:/a b.wav"')).toEqual({ kind: 'wav', path: 'C:/a b.wav', loop: true })
    expect(parseCommand('PARAR')).toEqual({ kind: 'stop' })
    expect(parseCommand('sair')).toEqual({ kind: 'quit' })
  })

  it('linha estranha ou wav sem arquivo não vira comando', () => {
    expect(parseCommand('')).toBeNull()
    expect(parseCommand('wav')).toBeNull()
    expect(parseCommand('wav loop')).toBeNull()
    expect(parseCommand('tocar')).toBeNull()
  })
})

describe('argumentos do bot', () => {
  it('lê as flags do terminal e cai nas variáveis do app', () => {
    expect(parseBotArgs(['--api', 'http://26.1.2.3:3000/', '--sessao', 's', '--canal', 'Geral', '--tocar', 'tom'], {})).toEqual({
      apiUrl: 'http://26.1.2.3:3000',
      session: 's',
      channel: 'Geral',
      botNumber: 1,
      play: 'tom',
    })
    expect(parseBotArgs([], { RADCORD_BOT_API: 'http://x:3000', RADCORD_BOT_SESSION: 't', RADCORD_BOT_CHANNEL: 'id', RADCORD_BOT_NUMBER: '3' })).toEqual({
      apiUrl: 'http://x:3000',
      session: 't',
      channel: 'id',
      botNumber: 3,
      play: null,
    })
  })

  it('falta ou valor ruim explica o que esperava', () => {
    expect(() => parseBotArgs(['--sessao', 's', '--canal', 'c'], {})).toThrow(/--api inválido/)
    expect(() => parseBotArgs(['--api', 'http://x', '--canal', 'c'], {})).toThrow(/--sessao ausente/)
    expect(() => parseBotArgs(['--api', 'http://x', '--sessao', 's'], {})).toThrow(/--canal ausente/)
    expect(() => parseBotArgs(['--api', 'http://x', '--sessao', 's', '--canal', 'c', '--numero', '0'], {})).toThrow(/--numero "0" inválido/)
    expect(() => parseBotArgs(['--api'], {})).toThrow(/--api sem valor/)
  })
})
