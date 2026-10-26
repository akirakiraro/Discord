import { describe, expect, it } from 'vitest'
import { HOST_UNAVAILABLE, type HostSnapshot } from '../../shared/hostSnapshot'
import { closeWarning, stopWarning } from './hostMessages'
import { hostBlocksInstall, planAppClose } from './hostClose'

function snapshot(patch: Partial<HostSnapshot>): HostSnapshot {
  return { ...HOST_UNAVAILABLE, moduleReady: true, phase: 'on', ownedByApp: true, radminIp: '26.186.21.58', ...patch }
}

describe('fechar o app e adiar a atualização', () => {
  it('com gente na call pede a frase exata e sem ninguém desliga antes de sair', () => {
    expect(planAppClose(snapshot({ online: 2, inVoice: 1 }))).toEqual({
      kind: 'confirm',
      online: 2,
      inVoice: 1,
      message: closeWarning(2, 1),
    })
    expect(closeWarning(2, 1)).toBe('Fechar o SoundRoom desliga o host e derruba a call de 2 pessoas online (1 na call).')
    expect(planAppClose(snapshot({ online: 0, inVoice: 0 }))).toEqual({ kind: 'stop-then-quit' })
    expect(stopWarning(0, 0)).toBe('Desligar derruba a call de todos. Agora: 0 pessoas online e 0 na call.')
  })

  it('host do terminal, desligado ou de outro dono só fecha o app', () => {
    expect(planAppClose(snapshot({ ownedByApp: false, phase: 'external', online: 4, inVoice: 4 }))).toEqual({ kind: 'quit' })
    expect(planAppClose(snapshot({ phase: 'off', ownedByApp: false }))).toEqual({ kind: 'quit' })
    expect(planAppClose(HOST_UNAVAILABLE)).toEqual({ kind: 'quit' })
  })

  it('a atualização espera o host que este app ligou e ignora o do terminal', () => {
    expect(hostBlocksInstall(snapshot({ phase: 'on' }))).toBe(true)
    expect(hostBlocksInstall(snapshot({ phase: 'starting' }))).toBe(true)
    expect(hostBlocksInstall(snapshot({ phase: 'stopping' }))).toBe(true)
    expect(hostBlocksInstall(snapshot({ phase: 'external', ownedByApp: false }))).toBe(false)
    expect(hostBlocksInstall(snapshot({ phase: 'off', ownedByApp: false }))).toBe(false)
  })
})
