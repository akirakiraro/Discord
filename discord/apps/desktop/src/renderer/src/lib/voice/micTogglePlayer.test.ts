import { describe, expect, it } from 'vitest'
import { MicTogglePlayer, type ToggleAudio } from './micTogglePlayer'
import type { ToggleSound } from './micToggleSound'

class FakeToggleAudio implements ToggleAudio {
  currentTime = 0
  state: AudioContextState = 'running'
  destination = { name: 'speakers' } as unknown as AudioNode
  resumed = 0
  started = 0
  connected: unknown[] = []

  async resume(): Promise<void> {
    this.resumed += 1
    this.state = 'running'
  }

  createOscillator(): OscillatorNode {
    const audio = this
    const osc = {
      type: 'sine',
      frequency: { setValueAtTime: () => undefined },
      connect: () => undefined,
      start: () => {
        audio.started += 1
      },
      stop: () => undefined,
    }
    return osc as unknown as OscillatorNode
  }

  createGain(): GainNode {
    const audio = this
    const gain = {
      gain: {
        setValueAtTime: () => undefined,
        exponentialRampToValueAtTime: () => undefined,
      },
      connect: (node: unknown) => {
        audio.connected.push(node)
      },
    }
    return gain as unknown as GainNode
  }
}

describe('MicTogglePlayer', () => {
  it.each(['mute', 'unmute', 'deafen', 'undeafen'] as const)('toca %s na saída local, duas notas', (kind: ToggleSound) => {
    const audio = new FakeToggleAudio()
    const player = new MicTogglePlayer(() => audio)

    player.play(kind)

    expect(audio.started, kind).toBe(2)
    expect(audio.connected, 'as duas notas vão só para a caixa deste PC').toEqual([audio.destination, audio.destination])
  })

  it('contexto suspenso pede resume no mesmo clique', () => {
    const audio = new FakeToggleAudio()
    audio.state = 'suspended'
    const player = new MicTogglePlayer(() => audio)

    player.play('deafen')

    expect(audio.resumed).toBe(1)
    expect(audio.started).toBe(2)
  })

  it('contexto ausente ou que explode não derruba o clique', () => {
    const missing = new MicTogglePlayer(() => null)
    const broken = new MicTogglePlayer(() => {
      throw new Error('AudioContext bloqueado')
    })

    expect(() => missing.play('mute')).not.toThrow()
    expect(() => broken.play('deafen')).not.toThrow()
  })
})
