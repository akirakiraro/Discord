import { describe, expect, it } from 'vitest'
import type { AudioProcessorOptions } from 'livekit-client'
import { SensitivityGate } from './sensitivityGate'

describe('SensitivityGate', () => {
  it('grava o limite antes de o LiveKit ligar o áudio', () => {
    const gate = new SensitivityGate(() => -45)

    gate.setThreshold(-5)

    expect(gate.thresholdDb).toBe(-10)
  })

  it('recusa ligar sem AudioContext', async () => {
    const gate = new SensitivityGate(() => -45)

    await expect(gate.init({} as AudioProcessorOptions)).rejects.toThrow(/AudioContext ausente/)
  })
})