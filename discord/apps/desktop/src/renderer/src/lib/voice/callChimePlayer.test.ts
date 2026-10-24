import { describe, expect, it } from 'vitest'
import { callSoundSinkId, chimeNotes, chimeSpan, chosenSinkId, CallChimePlayer, sinkIdFromElements, type ChimeAudio } from './callChimePlayer'

function notesOf(kind: 'join' | 'leave'): number[] {
  return chimeNotes(kind).map((note) => note.hz)
}

class FakeAudio implements ChimeAudio {
  currentTime = 0
  state: AudioContextState = 'running'
  destination = {} as AudioNode
  sink = ''
  sinkError: Error | null = null
  started = 0

  async resume(): Promise<void> {
    this.state = 'running'
  }

  async setSinkId(id: string): Promise<void> {
    if (this.sinkError) throw this.sinkError
    this.sink = id
  }

  createOscillator(): OscillatorNode {
    const osc = {
      type: 'sine',
      frequency: { setValueAtTime: () => undefined },
      connect: () => undefined,
      start: () => {
        this.started += 1
      },
      stop: () => undefined,
    }
    return osc as unknown as OscillatorNode
  }

  createGain(): GainNode {
    const gain = {
      gain: {
        setValueAtTime: () => undefined,
        exponentialRampToValueAtTime: () => undefined,
      },
      connect: () => undefined,
    }
    return gain as unknown as GainNode
  }
}

async function settle(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('callChimePlayer', () => {
  it('entrada sobe, saída desce, e os dois duram menos de 0,6 s', () => {
    const join = notesOf('join')
    const leave = notesOf('leave')

    expect(join[0], 'primeira nota da entrada').toBeLessThan(join[1] ?? 0)
    expect(leave[0], 'primeira nota da saída').toBeGreaterThan(leave[1] ?? 0)
    expect(join).not.toEqual(leave)
    expect(chimeSpan(chimeNotes('join')), 'curto o bastante para não atropelar a fala').toBeLessThan(0.6)
    expect(chimeSpan(chimeNotes('leave'))).toBeLessThan(0.6)
  })

  it('escolhe o dispositivo de saída só quando ele existe', () => {
    expect(chosenSinkId(undefined)).toBeNull()
    expect(chosenSinkId('')).toBeNull()
    expect(chosenSinkId('default')).toBeNull()
    expect(chosenSinkId('  headset  ')).toBe('headset')
    expect(sinkIdFromElements([{ sinkId: 'default' }, { sinkId: 'speakers' }])).toBe('speakers')
    expect(callSoundSinkId('headphones', [{ sinkId: 'speakers' }])).toBe('headphones')
    expect(callSoundSinkId('default', [{ sinkId: 'speakers' }])).toBe('speakers')
    expect(callSoundSinkId(null, [])).toBeNull()
  })

  it('setSinkId manda o som ao dispositivo, e a falha não rejeita', async () => {
    const audio = new FakeAudio()
    const player = new CallChimePlayer(() => audio)

    player.prime()
    player.play('join', 0.7, 'headset')
    await settle()

    expect(audio.sink).toBe('headset')
    expect(audio.started, 'duas notas').toBe(2)

    audio.sinkError = new Error('dispositivo sumiu')
    expect(() => player.play('leave', 0.7, 'outro')).not.toThrow()
    await settle()
    expect(audio.started).toBe(4)
  })

  it('contexto ausente ou que explode não derruba quem chamou', () => {
    const missing = new CallChimePlayer(() => null)
    const broken = new CallChimePlayer(() => {
      throw new Error('AudioContext bloqueado')
    })

    expect(() => missing.play('join', 1, null)).not.toThrow()
    expect(() => broken.prime()).not.toThrow()
    expect(() => broken.play('leave', 1, 'headset')).not.toThrow()
  })
})
