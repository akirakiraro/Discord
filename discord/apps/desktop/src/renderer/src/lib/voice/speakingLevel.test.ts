import { describe, expect, it } from 'vitest'
import { rmsLevel, SILENT_SPEAK_STATE, SPEAK_HOLD_MS, stepSpeaking } from './speakingLevel'

describe('rmsLevel', () => {
  it('trata o meio da escala como silêncio', () => {
    expect(rmsLevel(new Uint8Array([128, 128, 128]))).toBe(0)
  })

  it('sobe quando as amostras saem do silêncio', () => {
    expect(rmsLevel(new Uint8Array([128, 255]))).toBeGreaterThan(0.4)
  })
})

describe('stepSpeaking', () => {
  it('acende no primeiro quadro acima do limiar', () => {
    expect(stepSpeaking(SILENT_SPEAK_STATE, 0.05, 32).speaking).toBe(true)
  })

  it('segura o verde por um instante entre sílabas', () => {
    const speaking = stepSpeaking(SILENT_SPEAK_STATE, 0.05, 32)
    const held = stepSpeaking(speaking, 0, 32)
    expect(held.speaking).toBe(true)
    expect(held.quietMs).toBe(32)
  })

  it('apaga depois do silêncio combinado', () => {
    const speaking = { speaking: true, quietMs: SPEAK_HOLD_MS - 10 }
    expect(stepSpeaking(speaking, 0, 10)).toEqual(SILENT_SPEAK_STATE)
  })
})
