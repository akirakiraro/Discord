import { describe, expect, it } from 'vitest'
import type { AudioProcessorOptions } from 'livekit-client'
import { forceMonoOutput, SensitivityGate } from './sensitivityGate'

describe('SensitivityGate', () => {
  it('grava o limite antes de o LiveKit ligar o áudio', () => {
    const gate = new SensitivityGate(() => -45, () => 1)

    gate.setThreshold(-5)
    gate.setVolume(9)

    expect(gate.thresholdDb).toBe(-10)
    expect(gate.inputGain).toBe(4)
  })

  it('o destino do portão fica em um canal', () => {
    const sink = { channelCount: 2, channelCountMode: 'max' as const }

    forceMonoOutput(sink)

    expect(sink).toEqual({ channelCount: 1, channelCountMode: 'explicit' })
  })

  it('recusa ligar sem AudioContext', async () => {
    const gate = new SensitivityGate(() => -45, () => 1)

    await expect(gate.init({} as AudioProcessorOptions)).rejects.toThrow(/AudioContext ausente/)
  })
})