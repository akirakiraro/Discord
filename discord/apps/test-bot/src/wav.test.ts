import { describe, expect, it } from 'vitest'
import { encodeWav, parseWav } from './wav'

describe('WAV do bot', () => {
  it('ida e volta de um mono de 16 bits', () => {
    const samples = Int16Array.from([0, 1000, -1000, 32767, -32768])
    const clip = parseWav(encodeWav({ sampleRate: 44_100, samples }))
    expect(clip.sampleRate).toBe(44_100)
    expect([...clip.samples]).toEqual([...samples])
  })

  it('estéreo vira a média dos canais', () => {
    const bytes = encodeWav({ sampleRate: 48_000, samples: Int16Array.from([100, 300, -200, 0]) })
    const view = new DataView(bytes.buffer)
    view.setUint16(22, 2, true)
    view.setUint16(32, 4, true)
    expect([...parseWav(bytes).samples]).toEqual([200, -100])
  })

  it('recusa o que não é PCM de 16 bits, com o motivo', () => {
    expect(() => parseWav(new TextEncoder().encode('ID3 mp3 qualquer coisa ...........'))).toThrow(/não é WAV/)
    const bytes = encodeWav({ sampleRate: 48_000, samples: new Int16Array(4) })
    new DataView(bytes.buffer).setUint16(34, 24, true)
    expect(() => parseWav(bytes)).toThrow(/esperado PCM \(1\) de 16 bits/)
  })
})
