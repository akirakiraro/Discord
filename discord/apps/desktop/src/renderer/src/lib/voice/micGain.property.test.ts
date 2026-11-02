import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { FakeAudioParam } from './fakeWebAudio'
import { aimGateOpen, limiterAttenuation, nextLevelerGain, softLimitSample } from './micGain'

const unit = { min: 0, max: 1, noNaN: true } as const

describe('propriedades do micGain', () => {
  it('até o joelho 0,85 o limiter devolve o sample', () => {
    fc.assert(fc.property(fc.double({ min: -0.85, max: 0.85, noNaN: true }), (sample) => softLimitSample(sample) === sample))
  })

  it('acima do joelho o pico desce e não passa de 1', () => {
    fc.assert(fc.property(fc.double({ min: 0.86, max: 1, noNaN: true }), (sample) => {
      const out = softLimitSample(sample)
      return out < sample && out > 0.85 && out <= 1
    }))
  })

  it('a curva de 0 a 1 é monótona', () => {
    fc.assert(fc.property(fc.double(unit), fc.double(unit), (left, right) => {
      const low = Math.min(left, right)
      const high = Math.max(left, right)
      return softLimitSample(low) <= softLimitSample(high)
    }))
  })

  it('o portão só grava 1 ou 0', () => {
    fc.assert(fc.property(fc.boolean(), (open) => {
      const param = new FakeAudioParam()
      aimGateOpen(param, open, 1)
      return param.value === (open ? 1 : 0)
    }))
  })

  it('o nivelador para no teto de 4 e, desligado, fica em 1', () => {
    fc.assert(fc.property(fc.double({ min: 0.008, max: 0.025, noNaN: true }), (rms) => nextLevelerGain(1, rms, true) === 1.24))
    expect(nextLevelerGain(9, 0.01, false)).toBe(1)
    expect(limiterAttenuation(0.5)).toBe(0)
  })
})
