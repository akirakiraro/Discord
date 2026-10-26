import { describe, expect, it } from 'vitest'
import { limiterAttenuation, limiterCurve, nextLevelerGain, peakSample, preSliderRms, softLimitSample } from './micGain'

describe('micGain', () => {
  it('100% do limiter é a reta: o sample do meio sai igual', () => {
    expect(softLimitSample(0)).toBe(0)
    expect(softLimitSample(0.5)).toBe(0.5)
    expect(softLimitSample(-0.5)).toBe(-0.5)
    expect(softLimitSample(0.95), 'o joelho segura o pico').toBeCloseTo(0.9374174418021864)
    expect(softLimitSample(1)).toBeCloseTo(0.9642391233933647)
    expect(softLimitSample(Number.NaN)).toBe(0)
    expect(limiterAttenuation(0.5), 'abaixo do joelho não atenua').toBe(0)
    expect(limiterAttenuation(1), 'o pico é segurado sem zerar').toBeCloseTo(0.035760876606635295)
    expect(peakSample(new Uint8Array([128])), '128 é silêncio').toBe(0)
    expect(peakSample(new Uint8Array([255, 128]))).toBeCloseTo(127 / 128)
  })

  it('a curva do shaper é identidade no meio e limitada na ponta', () => {
    const curve = limiterCurve()
    const mid = curve[Math.floor(curve.length / 2)] ?? 1
    const full = curve[curve.length - 1] ?? 0

    expect(mid, 'silêncio no centro da curva').toBeCloseTo(0, 5)
    expect(full, 'pico encosta sem passar de 1').toBeCloseTo(0.9642391233933647)
  })

  it('o nivelador desligado cola em 1 e o ligado não amplifica silêncio', () => {
    expect(nextLevelerGain(2, 0.05, false)).toBe(1)
    expect(nextLevelerGain(2, 0, true), 'silêncio volta um passo para 1').toBe(1.92)
    expect(nextLevelerGain(1, 0.05, true), 'voz baixa sobe um passo até o alvo 2').toBe(1.08)
    expect(nextLevelerGain(1, 0.5, true), 'voz alta desce um passo até o piso 0,25').toBe(0.94)
    expect(preSliderRms(0.4, 4), 'o slider não entra na conta do nivelador').toBeCloseTo(0.1)
  })
})
