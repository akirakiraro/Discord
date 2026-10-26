import { describe, expect, it, vi } from 'vitest'
import { OWN_SCREEN_LISTEN, REMOTE_SCREEN_LISTEN, applyScreenVolume, clampUnitVolume, volumeTarget } from './screenAudioVolume'

describe('clampUnitVolume', () => {
  it.each([
    [0.35, 0.35],
    [-2, 0],
    [4, 1],
    [Number.NaN, 1],
  ])('clampUnitVolume(%s) → %s', (value, expected) => {
    expect(clampUnitVolume(value)).toBe(expected)
  })
})

describe('volume inicial', () => {
  it('a própria escuta nasce muda e a dos outros no máximo', () => {
    expect(OWN_SCREEN_LISTEN).toBe(0)
    expect(REMOTE_SCREEN_LISTEN).toBe(1)
  })
})

describe('volumeTarget', () => {
  it('a própria escuta só entra quando não há tela de outra pessoa', () => {
    expect(volumeTarget(true, false)).toBe('own')
    expect(volumeTarget(true, true)).toBe('remote')
    expect(volumeTarget(false, true)).toBe('remote')
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
