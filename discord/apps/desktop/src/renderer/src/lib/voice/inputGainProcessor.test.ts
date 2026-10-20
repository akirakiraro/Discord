import { describe, expect, it } from 'vitest'
import type { AudioProcessorOptions } from 'livekit-client'
import { InputGainProcessor } from './inputGainProcessor'

describe('InputGainProcessor', () => {
  it('aplica o ganho pedido antes mesmo de o LiveKit ligar o áudio', () => {
    const processor = new InputGainProcessor(() => 1)

    processor.setGain(4)

    expect(processor.appliedGain).toBe(2)
  })

  it('recusa ligar sem AudioContext', async () => {
    const processor = new InputGainProcessor(() => 1)

    await expect(processor.init({} as AudioProcessorOptions)).rejects.toThrow(/AudioContext ausente/)
  })
})
