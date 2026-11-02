import { describe, expect, it } from 'vitest'
import { framesOf, frameSize } from './frames'
import { speechLikeClip, TEST_SAMPLE_RATE } from './testSignal'

function rmsDb(samples: Int16Array, fromMs: number, toMs: number): number {
  const start = Math.round((fromMs / 1000) * TEST_SAMPLE_RATE)
  const end = Math.round((toMs / 1000) * TEST_SAMPLE_RATE)
  let sum = 0
  for (let index = start; index < end; index += 1) sum += ((samples[index] ?? 0) / 32767) ** 2
  return 20 * Math.log10(Math.sqrt(sum / (end - start)))
}

describe('sinal de teste', () => {
  const clip = speechLikeClip()

  it('dura uns 8 s a 48 kHz e não passa do teto', () => {
    expect(clip.sampleRate).toBe(48_000)
    expect(clip.samples.length / 48_000).toBeCloseTo(8.2, 1)
    const peak = clip.samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0)
    expect(peak, 'a fala de −20 dB não encosta no teto').toBeLessThan(16_000)
  })

  it('a fala normal fica perto de −20 dB e a baixa perto de −50 dB', () => {
    expect(rmsDb(clip.samples, 0, 1000)).toBeCloseTo(-20, 0)
    expect(rmsDb(clip.samples, 3250, 4000)).toBeCloseTo(-50, 0)
  })

  it('a pausa é silêncio de verdade', () => {
    expect(clip.samples.subarray(Math.round(1.5 * 48_000), Math.round(1.85 * 48_000)).every((sample) => sample === 0)).toBe(true)
  })

  it('corta em quadros de 10 ms e completa o último com silêncio', () => {
    expect(frameSize(48_000)).toBe(480)
    expect(frameSize(44_100)).toBe(441)
    const frames = [...framesOf(Int16Array.from({ length: 500 }, () => 7), 48_000)]
    expect(frames.map((frame) => frame.length)).toEqual([480, 480])
    expect(frames[1]?.[19]).toBe(7)
    expect(frames[1]?.[20]).toBe(0)
    expect(() => frameSize(100)).toThrow(/taxa 100 inválida/)
  })
})
