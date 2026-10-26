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

const HEARD_PERCENTS = [0, 1, 25, 40, 50, 99, 100, 101, 150, 199, 200]
const DIRECT_PERCENTS = [0, 1, 40, 50, 99, 100]
const BOOST_PERCENTS = [101, 150, 199, 200]
const GAIN_PAIRS: Array<[number, number]> = [[0, 100], [100, 101], [101, 200], [40, 150]]

describe('volume de quem escuta', () => {
  it('0% a 200% viram ganho proporcional, 100% é 1 e o teto é 2', () => {
    for (const value of HEARD_PERCENTS) {
      expect(gainFromPercent(value), `${value}%`).toBe(value / 100)
      expect(percentFromGain(gainFromPercent(value)), `${value}% volta`).toBe(value)
    }
    for (const [low, high] of GAIN_PAIRS) {
      expect(gainFromPercent(low)).toBeLessThanOrEqual(gainFromPercent(high))
    }
    expect(gainFromPercent(100)).toBe(1)
    expect(directListenVolume(1)).toBe(1)
    expect(clampListenerGain(9)).toBe(2)
    expect(clampListenerGain(-1)).toBe(0)
    expect(clampListenerGain(1.25)).toBe(1.25)
    expect(clampListenerGain(Number.NaN)).toBe(1)
    expect(LISTENER_UNITY).toBe(1)
    expect(LISTENER_MAX_GAIN).toBe(2)
  })

  it('100% e abaixo ficam no elemento; acima disso há ganho; surdo cala', () => {
    for (const value of DIRECT_PERCENTS) {
      expect(listenerPlayback(gainFromPercent(value), false), `${value}%`).toBe('direct')
    }
    for (const value of BOOST_PERCENTS) {
      expect(listenerPlayback(gainFromPercent(value), false), `${value}%`).toBe('boost')
    }
    for (const value of [0, 100, 200]) {
      expect(listenerPlayback(gainFromPercent(value), true), `${value}% surdo`).toBe('silent')
    }
    expect(listenerPlayback(0, false), 'mudo continua no elemento, sem desligar a faixa').toBe('direct')
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
    expect(boosted, '200% encosta em 1 sem passar').toBeCloseTo(0.9999999342434372)
    expect(preLimitGain(2)).toBe(1)
    expect(preLimitGain(1.5)).toBe(0.75)
    expect(limitBoostedSample(0.9, 1), 'ganho 1 acima do joelho muda o pico').toBeCloseTo(0.8982269106297451)
    expect(listenerPlayback(1, false), 'por isso 100% não entra no limitador').toBe('direct')
  })

  it('a curva do teto é silêncio no centro e não passa de 1', () => {
    const curve = boostCurve()
    const mid = curve[Math.floor(curve.length / 2)] ?? 1
    const full = curve[curve.length - 1] ?? 0

    expect(mid).toBeCloseTo(0, 5)
    expect(full).toBeCloseTo(0.9999999342434372)
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
