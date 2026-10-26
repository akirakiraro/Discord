import fc from 'fast-check'
import { describe, it } from 'vitest'
import {
  clampListenerGain,
  directListenVolume,
  gainFromPercent,
  limitBoostedSample,
  listenerPlayback,
  LISTENER_MAX_GAIN,
  LISTENER_UNITY,
  percentFromGain,
  preLimitGain,
} from './listenerVolume'

const percent = fc.integer({ min: 0, max: 200 })

describe('propriedades do volume por pessoa', () => {
  it('0 a 200% vira ganho 0 a 2, e 100% é 1 sem alterar', () => {
    fc.assert(fc.property(percent, (value) => gainFromPercent(value) === value / 100))
    fc.assert(fc.property(percent, (value) => percentFromGain(gainFromPercent(value)) === value))
    fc.assert(fc.property(fc.constant(100), () => gainFromPercent(100) === LISTENER_UNITY && directListenVolume(1) === 1))
  })

  it('a porcentagem é monótona e o ganho não sai de 0 a 2', () => {
    fc.assert(fc.property(percent, percent, (left, right) => gainFromPercent(Math.min(left, right)) <= gainFromPercent(Math.max(left, right))))
    fc.assert(fc.property(fc.double({ min: -5, max: 9, noNaN: true }), (value) => {
      const gain = clampListenerGain(value)
      return gain >= 0 && gain <= LISTENER_MAX_GAIN
    }))
  })

  it('100% fica no elemento e acima disso há ganho', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 100 }), (value) => listenerPlayback(gainFromPercent(value), false) === 'direct'))
    fc.assert(fc.property(fc.integer({ min: 101, max: 200 }), (value) => listenerPlayback(gainFromPercent(value), false) === 'boost'))
    fc.assert(fc.property(fc.boolean(), (deafened) => !deafened || listenerPlayback(2, deafened) === 'silent'))
  })

  it('abaixo do joelho o sample vezes o ganho sai igual, e o pico não passa de 1', () => {
    fc.assert(fc.property(fc.double({ min: -0.4, max: 0.4, noNaN: true }), (sample) => limitBoostedSample(sample, 1) === sample))
    fc.assert(fc.property(fc.double({ min: -1, max: 1, noNaN: true }), fc.double({ min: 0, max: 2, noNaN: true }), (sample, gain) => {
      return Math.abs(limitBoostedSample(sample, gain)) <= 1
    }))
    fc.assert(fc.property(fc.constant(2), () => preLimitGain(2) === 1 && preLimitGain(1) === 0.5))
  })
})