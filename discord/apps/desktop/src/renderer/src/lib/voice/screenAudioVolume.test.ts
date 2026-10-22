import { describe, expect, it, vi } from 'vitest'
import { applyScreenVolume, clampUnitVolume } from './screenAudioVolume'

describe('clampUnitVolume', () => {
  it.each([
    [0, 0],
    [0.35, 0.35],
    [1, 1],
    [-2, 0],
    [4, 1],
    [Number.NaN, 1],
  ])('clampUnitVolume(%s) → %s', (value, expected) => {
    expect(clampUnitVolume(value)).toBe(expected)
  })
})

describe('applyScreenVolume', () => {
  it('grava o volume limitado na faixa', () => {
    const track = { setVolume: vi.fn() }

    applyScreenVolume(track, 1.8)

    expect(track.setVolume).toHaveBeenCalledWith(1)
  })

  it('ignora faixa ausente', () => {
    expect(() => applyScreenVolume(undefined, 0.2)).not.toThrow()
  })
})
