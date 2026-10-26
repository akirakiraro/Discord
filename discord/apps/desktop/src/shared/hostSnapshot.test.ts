import { describe, expect, it } from 'vitest'
import { HOST_UNAVAILABLE, hostOccupancyLine, hostPhaseLabel, parseConfirmedFlag, parseHostQuitPrompt, parseHostSnapshot } from './hostSnapshot'

describe('snapshot do host', () => {
  it('nomeia cada fase e a linha de ocupação', () => {
    expect(hostPhaseLabel('unavailable')).toBe('Indisponível')
    expect(hostPhaseLabel('off')).toBe('Desligado')
    expect(hostPhaseLabel('starting')).toBe('Iniciando')
    expect(hostPhaseLabel('on')).toBe('Ligado')
    expect(hostPhaseLabel('stopping')).toBe('Desligando')
    expect(hostPhaseLabel('error')).toBe('Erro')
    expect(hostPhaseLabel('external')).toBe('Ligado fora do app')
    expect(hostOccupancyLine(2, 1)).toBe('2 pessoas online, 1 na call')
  })

  it('IPC ilegível vira indisponível e a confirmação só aceita boolean', () => {
    expect(parseHostSnapshot({ phase: 'ligado' })).toEqual(HOST_UNAVAILABLE)
    expect(parseHostSnapshot(null)).toEqual(HOST_UNAVAILABLE)
    const ready = { ...HOST_UNAVAILABLE, phase: 'off' as const, moduleReady: true }
    expect(parseHostSnapshot(ready)).toEqual(ready)
    expect(parseConfirmedFlag({ confirmed: true })).toBe(true)
    expect(parseConfirmedFlag({ confirmed: 'true' })).toBeNull()
    expect(parseHostQuitPrompt({ online: 2, inVoice: 1, message: 'Fechar' })).toEqual({ online: 2, inVoice: 1, message: 'Fechar' })
    expect(parseHostQuitPrompt({ online: 2, inVoice: 1, message: '' })).toBeNull()
  })
})
