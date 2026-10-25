import { describe, expect, it } from 'vitest'
import { limiterCurve, nextLevelerGain, preSliderRms, softLimitSample } from './micGain'

describe('micGain', () => {
  it('100% do limiter é a reta: o sample do meio sai igual', () => {
    expect(softLimitSample(0)).toBe(0)
    expect(softLimitSample(0.5)).toBe(0.5)
    expect(softLimitSample(-0.5)).toBe(-0.5)
    expect(softLimitSample(0.95), 'o joelho segura o pico').toBeLessThan(0.95)
    expect(softLimitSample(0.95)).toBeGreaterThan(0.85)
    expect(softLimitSample(1)).toBeLessThan(1)
    expect(softLimitSample(Number.NaN)).toBe(0)
  })

  it('a curva do shaper é identidade no meio e limitada na ponta', () => {
    const curve = limiterCurve()
    const mid = curve[Math.floor(curve.length / 2)] ?? 1
    const full = curve[curve.length - 1] ?? 0

    expect(mid, 'silêncio no centro da curva').toBeCloseTo(0, 5)
    expect(full, 'pico encosta sem passar de 1').toBeLessThanOrEqual(1)
    expect(full).toBeGreaterThan(0.9)
  })

  it('o nivelador desligado cola em 1 e o ligado não amplifica silêncio', () => {
    expect(nextLevelerGain(2, 0.05, false)).toBe(1)
    expect(nextLevelerGain(2, 0, true), 'silêncio volta para 1').toBeLessThan(2)
    expect(nextLevelerGain(1, 0.05, true), 'voz baixa sobe').toBeGreaterThan(1)
    expect(nextLevelerGain(1, 0.5, true), 'voz alta desce sem zerar').toBeLessThan(1)
    expect(preSliderRms(0.4, 4), 'o slider não entra na conta do nivelador').toBeCloseTo(0.1)
  })
})
