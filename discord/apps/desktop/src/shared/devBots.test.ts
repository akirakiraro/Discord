import { describe, expect, it } from 'vitest'
import { botCommandLine, devBotPhaseLabel, parseDevBotAction, parseDevBotAddRequest } from './devBots'

describe('contrato da área de testes', () => {
  it('pedido de bot exige os três campos em texto', () => {
    expect(parseDevBotAddRequest({ apiUrl: 'http://x:3000', session: 's', channelId: 'c' })).toEqual({ apiUrl: 'http://x:3000', session: 's', channelId: 'c' })
    expect(parseDevBotAddRequest({ apiUrl: 'http://x:3000', session: '', channelId: 'c' })).toBeNull()
    expect(parseDevBotAddRequest(null)).toBeNull()
  })

  it('ação de bot: wav precisa de caminho', () => {
    expect(parseDevBotAction({ kind: 'tone' })).toEqual({ kind: 'tone' })
    expect(parseDevBotAction({ kind: 'wav', path: 'C:/a.wav' })).toEqual({ kind: 'wav', path: 'C:/a.wav' })
    expect(parseDevBotAction({ kind: 'wav' })).toBeNull()
    expect(parseDevBotAction({ kind: 'apagar' })).toBeNull()
  })

  it('linha do stdin e rótulo da fase', () => {
    expect(botCommandLine({ kind: 'tone' })).toBe('tom loop')
    expect(botCommandLine({ kind: 'remove' })).toBe('sair')
    expect(devBotPhaseLabel('idle')).toBe('Na call, em silêncio')
  })
})
