import { describe, expect, it } from 'vitest'
import { HOST_UNAVAILABLE, type HostSnapshot } from '../../../shared/hostSnapshot'
import { withPendingStart } from './useHostPower'

function snapshot(patch: Partial<HostSnapshot>): HostSnapshot {
  return { ...HOST_UNAVAILABLE, moduleReady: true, radminIp: '26.186.21.58', ...patch }
}

describe('clique em Ligar host', () => {
  it('desligado ou com erro já aparece como iniciando, sem a frase do erro antigo', () => {
    expect(withPendingStart(snapshot({ phase: 'off' }), true)).toMatchObject({ phase: 'starting', message: null })
    expect(withPendingStart(snapshot({ phase: 'error', message: 'Porta 3000 ocupada' }), true)).toMatchObject({ phase: 'starting', message: null })
  })

  it('o que o processo principal já disse vale por cima do pedido', () => {
    expect(withPendingStart(snapshot({ phase: 'on' }), true).phase).toBe('on')
    expect(withPendingStart(snapshot({ phase: 'external' }), true).phase).toBe('external')
    expect(withPendingStart(snapshot({ phase: 'off' }), false).phase).toBe('off')
  })
})
