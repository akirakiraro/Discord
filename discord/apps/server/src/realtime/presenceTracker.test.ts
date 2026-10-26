import { describe, expect, it } from 'vitest'
import { PresenceTracker } from './presenceTracker'

describe('PresenceTracker', () => {
  it('fica online na primeira conexão e offline na última', () => {
    const presence = new PresenceTracker()

    expect(presence.connect('u-1'), 'primeira conexão').toBe(true)
    expect(presence.connect('u-1'), 'segunda janela').toBe(false)
    expect(presence.disconnect('u-1'), 'ainda há uma janela').toBe(false)
    expect(presence.isOnline('u-1')).toBe(true)
    expect(presence.disconnect('u-1'), 'última conexão').toBe(true)
    expect(presence.isOnline('u-1')).toBe(false)
  })

  it('ignora desconexão de quem não estava conectado', () => {
    const presence = new PresenceTracker()

    expect(presence.disconnect('fantasma')).toBe(false)
    expect(presence.isOnline('fantasma')).toBe(false)
  })
})
