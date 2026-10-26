import { describe, expect, it } from 'vitest'
import type { KeyValueStorage } from '../savedLogin'
import {
  boostCurve,
  canAdjustListener,
  clampListenerGain,
  directListenVolume,
  gainFromPercent,
  hearsRemoteIdentity,
  limitBoostedSample,
  listenerGain,
  listenerPlayback,
  LISTENER_MAX_GAIN,
  LISTENER_UNITY,
  loadListenerVolumes,
  percentFromGain,
  preLimitGain,
  saveListenerVolumes,
  withListenerGain,
} from './listenerVolume'

class MemoryStorage implements KeyValueStorage {
  private readonly entries = new Map<string, string>()

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value)
  }
}

describe('volume de quem escuta', () => {
  it('100% é ganho 1 e 200% é o teto', () => {
    expect(gainFromPercent(100)).toBe(LISTENER_UNITY)
    expect(gainFromPercent(200)).toBe(LISTENER_MAX_GAIN)
    expect(gainFromPercent(0)).toBe(0)
    expect(gainFromPercent(150)).toBe(1.5)
    expect(percentFromGain(1.5)).toBe(150)
    expect(clampListenerGain(9)).toBe(2)
    expect(clampListenerGain(Number.NaN)).toBe(1)
  })

  it('100% e abaixo ficam no elemento; acima disso há ganho; surdo cala', () => {
    expect(listenerPlayback(1, false)).toBe('direct')
    expect(listenerPlayback(0.4, false)).toBe('direct')
    expect(listenerPlayback(0, false), 'mudo continua no elemento, sem desligar a faixa').toBe('direct')
    expect(listenerPlayback(1.5, false)).toBe('boost')
    expect(listenerPlayback(2, false)).toBe('boost')
    expect(listenerPlayback(2, true)).toBe('silent')
    expect(listenerPlayback(1, true)).toBe('silent')
    expect(directListenVolume(1)).toBe(1)
    expect(directListenVolume(0.25)).toBe(0.25)
    expect(directListenVolume(2), 'o elemento não passa de 1').toBe(1)
  })

  it('não ajusta a própria voz nem o monitor, e não toca esses dois', () => {
    expect(canAdjustListener('eu', 'ela')).toBe(true)
    expect(canAdjustListener('eu', 'eu')).toBe(false)
    expect(canAdjustListener('eu', 'eu:monitor')).toBe(false)
    expect(canAdjustListener('', 'ela')).toBe(false)
    expect(hearsRemoteIdentity('ela', false)).toBe(true)
    expect(hearsRemoteIdentity('eu', true)).toBe(false)
    expect(hearsRemoteIdentity('eu:monitor', false)).toBe(false)
  })

  it('o limitador é a reta até o joelho e segura o pico de 200%', () => {
    expect(limitBoostedSample(0.2, 2)).toBeCloseTo(0.4)
    expect(limitBoostedSample(0.4, 2)).toBeCloseTo(0.8)
    expect(limitBoostedSample(0.2 * preLimitGain(1.5), LISTENER_MAX_GAIN)).toBeCloseTo(0.3)
    const boosted = limitBoostedSample(1 * preLimitGain(2), LISTENER_MAX_GAIN)
    expect(boosted, '200% não estoura 1').toBeLessThan(1)
    expect(boosted).toBeGreaterThan(0.85)
    expect(preLimitGain(2)).toBe(1)
    expect(preLimitGain(1.5)).toBe(0.75)
    expect(limitBoostedSample(0.9, 1), 'ganho 1 acima do joelho muda o pico').toBeLessThan(0.9)
    expect(listenerPlayback(1, false), 'por isso 100% não entra no limitador').toBe('direct')
  })

  it('a curva do teto é silêncio no centro e não passa de 1', () => {
    const curve = boostCurve()
    const mid = curve[Math.floor(curve.length / 2)] ?? 1
    const full = curve[curve.length - 1] ?? 0

    expect(mid).toBeCloseTo(0, 5)
    expect(full).toBeLessThanOrEqual(1)
    expect(full).toBeGreaterThan(0.85)
  })

  it('lembra o volume por pessoa e por quem está logado', () => {
    const storage = new MemoryStorage()
    const saved = withListenerGain(withListenerGain({}, 'eu', 'ela', 1.5), 'eu', 'bia', 0.5)
    const other = withListenerGain(saved, 'outro', 'ela', 2)
    saveListenerVolumes(storage, other)

    const file = loadListenerVolumes(storage)
    expect(listenerGain(file, 'eu', 'ela')).toBe(1.5)
    expect(listenerGain(file, 'eu', 'bia')).toBe(0.5)
    expect(listenerGain(file, 'outro', 'ela')).toBe(2)
    expect(listenerGain(file, 'eu', 'sumida'), 'sem preferência é 100%').toBe(1)
  })

  it('não grava a própria voz, o monitor, nem JSON quebrado', () => {
    const storage = new MemoryStorage()
    const untouched = withListenerGain(withListenerGain({}, 'eu', 'eu', 2), 'eu', 'eu:monitor', 2)
    expect(untouched).toEqual({})
    storage.setItem('radcord.listenerVolume', '{')
    expect(loadListenerVolumes(storage)).toEqual({})
    storage.setItem('radcord.listenerVolume', JSON.stringify({
      eu: { ela: 9, 'ela:monitor': 2, '': 1, ruido: 'alto' },
      '': { ela: 1 },
    }))
    expect(loadListenerVolumes(storage)).toEqual({ eu: { ela: 2 } })
  })
})
