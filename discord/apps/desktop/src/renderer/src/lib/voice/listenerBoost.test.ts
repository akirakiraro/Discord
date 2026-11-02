import { describe, expect, it, vi } from 'vitest'
import { FakeAudioNode, FakeGainNode, FakeWaveShaper } from './fakeWebAudio'
import {
  connectListenerBoost,
  ensureCallAudioContext,
  holdRemoteForBoost,
  readCallAudioContext,
  retuneListenerBoost,
  type AttachableAudio,
  type ListenerBoostGraph,
} from './listenerBoost'
import { preLimitGain } from './listenerVolume'

function graph(): { graph: ListenerBoostGraph; gain: FakeGainNode; shaper: FakeWaveShaper; destination: FakeAudioNode; resume: ReturnType<typeof vi.fn>; seen: MediaStream[] } {
  const destination = new FakeAudioNode()
  const gain = new FakeGainNode()
  const shaper = new FakeWaveShaper()
  const resume = vi.fn(async () => undefined)
  const seen: MediaStream[] = []
  return {
    destination,
    gain,
    shaper,
    resume,
    seen,
    graph: {
      currentTime: 4,
      state: 'running',
      resume,
      createMediaStreamSource: (stream) => {
        seen.push(stream)
        return new FakeAudioNode()
      },
      createGain: () => gain,
      createWaveShaper: () => shaper,
      destination,
    },
  }
}

function fakeStream(): MediaStream {
  return { getAudioTracks: () => [] } as unknown as MediaStream
}

describe('ganho de quem escuta', () => {
  it('grava o ganho com setValueAtTime e põe o limitador depois', () => {
    const built = graph()
    const stream = fakeStream()
    const chain = connectListenerBoost(built.graph, stream, 1.5)

    expect(chain.gain).toBe(built.gain.gain)
    expect(built.gain.gain.value, 'o valor e o agendamento coincidem').toBe(preLimitGain(1.5))
    expect(built.gain.gain.scheduled).toEqual([{ value: 0.75, time: 4 }])
    expect(built.gain.links, 'o limitador fica depois do ganho').toEqual([built.shaper])
    expect(built.shaper.links).toEqual([built.destination])
    expect(built.shaper.oversample, 'sem oversample para não mudar o timbre').toBe('none')
    expect(built.shaper.curve?.[0]).toBeLessThan(0)
    expect(built.resume).not.toHaveBeenCalled()
    expect(built.seen, 'o grafo recebe o mesmo stream do elemento').toEqual([stream])
  })

  it('200% enche o nó que a curva interpreta como o dobro', () => {
    const built = graph()
    const chain = connectListenerBoost(built.graph, fakeStream(), 2)

    expect(built.gain.gain.scheduled[0]?.value).toBe(1)
    retuneListenerBoost(chain, 1.25, 9)
    expect(built.gain.gain.scheduled.at(-1)).toEqual({ value: 0.625, time: 9 })
  })

  it('contexto suspenso pede resume no mesmo grafo', () => {
    const built = graph()
    built.graph.state = 'suspended'

    connectListenerBoost(built.graph, fakeStream(), 2)

    expect(built.resume).toHaveBeenCalledOnce()
  })

  it('reusa o contexto da sala e não abre outro', async () => {
    const context = { state: 'running', resume: vi.fn() } as unknown as AudioContext
    const room = { audioContext: context, startAudio: vi.fn(async () => undefined) }

    await expect(ensureCallAudioContext(room)).resolves.toBe(context)
    expect(room.startAudio, 'a call já tem contexto').not.toHaveBeenCalled()
    expect(readCallAudioContext(room)).toBe(context)
  })

  it('pede o contexto que a call abre e recusa seguir sem ele', async () => {
    const context = { state: 'suspended', resume: vi.fn(async () => undefined) } as unknown as AudioContext
    const room: { audioContext?: AudioContext; startAudio: () => Promise<void> } = {
      audioContext: undefined,
      startAudio: async () => {
        room.audioContext = context
      },
    }

    await expect(ensureCallAudioContext(room)).resolves.toBe(context)
    expect(context.resume).toHaveBeenCalledOnce()
    room.audioContext = { state: 'closed' } as AudioContext
    expect(readCallAudioContext(room)).toBeUndefined()
    room.startAudio = async () => {
      room.audioContext = undefined
    }
    await expect(ensureCallAudioContext(room)).rejects.toThrow(/AudioContext da sala ausente/)
  })

  it('cala o elemento depois do attach e solta a faixa uma vez', () => {
    const stream = fakeStream()
    const element = heldElement()
    const detached: unknown[] = []
    const held = holdRemoteForBoost(audioTrack(stream, detached), element as unknown as HTMLAudioElement)

    expect(held.stream, 'é o srcObject, não um MediaStream novo').toBe(stream)
    expect(element.muted, 'o attach deixa o elemento com som').toBe(true)
    expect(element.volume).toBe(0)
    held.release()
    held.release()
    expect(detached, 'soltar duas vezes não desanexa de novo').toEqual([element])
  })

  it('recusa o que não é áudio e o attach sem srcObject', () => {
    const element = heldElement()
    const video: AttachableAudio = { kind: 'video', attach: (el) => el, detach: (el) => el }
    expect(() => holdRemoteForBoost(video, element as unknown as HTMLAudioElement)).toThrow(/faixa video/)

    const silent: AttachableAudio = { kind: 'audio', attach: (el) => el, detach: (el) => el }
    expect(() => holdRemoteForBoost(silent, element as unknown as HTMLAudioElement)).toThrow(/recebido null/)
  })
})

function heldElement(): { muted: boolean; volume: number; srcObject: MediaStream | null } {
  return { muted: false, volume: 1, srcObject: null }
}

function audioTrack(stream: MediaStream, detached: unknown[]): AttachableAudio {
  return {
    kind: 'audio',
    attach: (el) => {
      el.muted = false
      el.volume = 1
      el.srcObject = stream
      return el
    },
    detach: (el) => {
      detached.push(el)
      return el
    },
  }
}
