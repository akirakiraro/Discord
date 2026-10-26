import fc from 'fast-check'
import { describe, it } from 'vitest'
import { limitBoostedSample, preLimitGain } from './listenerVolume'

describe('propriedades do volume por pessoa', () => {
  it('abaixo do joelho o sample vezes o ganho sai igual, e o pico não passa de 1', () => {
    fc.assert(fc.property(fc.double({ min: -0.4, max: 0.4, noNaN: true }), (sample) => limitBoostedSample(sample, 1) === sample))
    fc.assert(fc.property(fc.double({ min: -1, max: 1, noNaN: true }), fc.double({ min: 0, max: 2, noNaN: true }), (sample, gain) => {
      return Math.abs(limitBoostedSample(sample, gain)) <= 1
    }))
    fc.assert(fc.property(fc.constant(2), () => preLimitGain(2) === 1 && preLimitGain(1) === 0.5))
  })
})