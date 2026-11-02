import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MIC_PREFERENCES } from './micPreferences'
import { FakeAudioContext, fakeMediaTrack } from './fakeWebAudio'
import { localEarConstraints, startLocalEar } from './localEar'
import { voiceRoom } from './voiceSession'

describe('localEarConstraints', () => {
  it('desliga o eco para o teste local não apagar a própria voz', () => {
    const constraints = localEarConstraints(DEFAULT_MIC_PREFERENCES)

    expect(constraints.echoCancellation).toEqual({ exact: false })
    expect(constraints.deviceId).toBeUndefined()
    expect(localEarConstraints({ ...DEFAULT_MIC_PREFERENCES, deviceId: 'headset' }).deviceId).toEqual({ exact: 'headset' })
  })
})

describe('startLocalEar', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('abre e fecha a escuta local sem mexer na faixa publicada', async () => {
    const published = vi.spyOn(voiceRoom.localParticipant, 'setMicrophoneEnabled')
    const seen: MediaStreamConstraints[] = []
    const local = stoppableTrack()
    const context = installEar(seen, local)

    const stop = await startLocalEar(DEFAULT_MIC_PREFERENCES, () => DEFAULT_MIC_PREFERENCES)
    const gate = context.gains[2]
    expect(gate?.gain.value, 'o portão nasce fechado').toBe(0)
    expect(seen).toEqual([{ audio: localEarConstraints(DEFAULT_MIC_PREFERENCES) }])

    stop()

    expect(published, 'a escuta local não republica o microfone da call').not.toHaveBeenCalled()
    expect(local.stops, 'só a captura local é solta').toBe(1)
    expect(context.closed).toBe(1)
    expect(seen, 'fechar não pede o microfone de novo').toHaveLength(1)
    expect(context.cleared).toEqual([1])
    expect(context.sources[0]?.links).toEqual([])
    expect(gate?.links).toContain(context.destination)
  })

  it('stream sem faixa não abre contexto', async () => {
    installEar([], undefined)
    await expect(startLocalEar(DEFAULT_MIC_PREFERENCES, () => DEFAULT_MIC_PREFERENCES)).rejects.toThrow(/sem faixa de áudio/)
  })
})

function stoppableTrack(): MediaStreamTrack & { stops: number } {
  const track = fakeMediaTrack(1) as MediaStreamTrack & { stops: number }
  track.stops = 0
  track.stop = () => {
    track.stops += 1
  }
  return track
}

function installEar(seen: MediaStreamConstraints[], track: MediaStreamTrack | undefined): FakeAudioContext & { cleared: number[] } {
  const context = new FakeAudioContext() as FakeAudioContext & { cleared: number[] }
  context.cleared = []
  vi.stubGlobal('AudioContext', class {
    constructor() {
      return context
    }
  })
  vi.stubGlobal('MediaStream', class FakeMediaStream {
    constructor(readonly tracks: readonly MediaStreamTrack[]) {}
  })
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: async (constraints: MediaStreamConstraints) => {
        seen.push(constraints)
        return { getAudioTracks: () => (track ? [track] : []), getTracks: () => (track ? [track] : []) }
      },
    },
  })
  vi.stubGlobal('window', {
    setInterval: () => 1,
    clearInterval: (timer: number) => {
      context.cleared.push(timer)
    },
  })
  return context
}
