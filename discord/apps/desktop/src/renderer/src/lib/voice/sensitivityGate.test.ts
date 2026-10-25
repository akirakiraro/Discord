import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AudioProcessorOptions } from 'livekit-client'
import { forceMonoOutput, SensitivityGate } from './sensitivityGate'

class FakeParam {
  value = 0
  cancelScheduledValues(): void {}
  setValueAtTime(value: number): void {
    this.value = value
  }
  setTargetAtTime(value: number): void {
    this.value = value
  }
}

class FakeNode {
  readonly outs: Array<{ to: FakeNode; output: number }> = []

  connect(to: FakeNode, output = 0): FakeNode {
    this.outs.push({ to, output })
    return this
  }

  disconnect(): void {
    this.outs.length = 0
  }
}

class FakeGain extends FakeNode {
  readonly gain = new FakeParam()
}

class FakeShaper extends FakeNode {
  curve: Float32Array | null = null
  oversample = 'none'
}

class FakeAnalyser extends FakeNode {
  fftSize = 0
  fill = 128

  getByteTimeDomainData(buffer: Uint8Array): void {
    buffer.fill(this.fill)
  }
}

class FakeDestination extends FakeNode {
  channelCount = 2
  channelCountMode: 'max' | 'clamped-max' | 'explicit' = 'max'
  readonly track = { stop(): void {} }
  readonly stream = { getAudioTracks: (): Array<{ stop(): void }> => [this.track] }
}

class FakeContext {
  sampleRate = 44_100
  currentTime = 1.5
  state: AudioContextState = 'suspended'
  resumed = 0
  readonly gains: FakeGain[] = []
  readonly shapers: FakeShaper[] = []
  readonly analysers: FakeAnalyser[] = []
  readonly splitters: FakeNode[] = []
  readonly sources: FakeNode[] = []
  destinationNode: FakeDestination | null = null

  resume(): Promise<void> {
    this.resumed += 1
    this.state = 'running'
    return Promise.resolve()
  }

  createMediaStreamSource(): FakeNode {
    return remember(this.sources, new FakeNode())
  }

  createGain(): FakeGain {
    return remember(this.gains, new FakeGain())
  }

  createWaveShaper(): FakeShaper {
    return remember(this.shapers, new FakeShaper())
  }

  createAnalyser(): FakeAnalyser {
    return remember(this.analysers, new FakeAnalyser())
  }

  createChannelSplitter(): FakeNode {
    return remember(this.splitters, new FakeNode())
  }

  createMediaStreamDestination(): FakeDestination {
    this.destinationNode = new FakeDestination()
    return this.destinationNode
  }
}

function remember<T>(list: T[], node: T): T {
  list.push(node)
  return node
}

function fakeTrack(channelCount: number): MediaStreamTrack {
  return { getSettings: () => ({ channelCount }) } as MediaStreamTrack
}

function installDom(holder: { tick: () => void }): void {
  vi.stubGlobal('MediaStream', class FakeMediaStream {
    constructor(readonly tracks: readonly MediaStreamTrack[]) {}
  })
  vi.stubGlobal('window', {
    setInterval: (fn: () => void) => {
      holder.tick = fn
      return 1
    },
    clearInterval: () => undefined,
  })
}

function reaches(from: FakeNode, target: FakeNode): boolean {
  const pending = [from]
  const seen = new Set<FakeNode>()
  while (pending.length > 0) {
    const node = pending.pop()
    if (!node || seen.has(node)) continue
    if (node === target) return true
    seen.add(node)
    for (const edge of node.outs) pending.push(edge.to)
  }
  return false
}

describe('SensitivityGate', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

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

  it('o ganho do slider fica no caminho da faixa publicada e 100% não altera', async () => {
    const holder = { tick: () => undefined }
    installDom(holder)
    const context = new FakeContext()
    const gate = new SensitivityGate(() => -45, () => 1, () => false)

    await gate.init({ audioContext: context, track: fakeTrack(2) } as unknown as AudioProcessorOptions)

    const published = context.destinationNode
    const slider = context.gains[1]
    expect(published, 'o destino do Web Audio é a faixa publicada').toBeTruthy()
    expect(gate.processedTrack).toBe(published?.track)
    expect(context.sampleRate, 'reusa o contexto da sala, mesmo fora de 48 kHz').toBe(44_100)
    expect(context.resumed, 'contexto suspenso volta a rodar').toBe(1)
    expect(slider?.gain.value, '100% é ganho 1').toBe(1)
    expect(reaches(context.sources[0] as FakeNode, published as FakeNode)).toBe(true)
    expect(reaches(slider as FakeNode, published as FakeNode)).toBe(true)
    expect(context.splitters[0]?.outs[0]?.to, 'estéreo usa só o canal 0').toBe(context.gains[0])
    expect(context.splitters[0]?.outs[0]?.output).toBe(0)
    expect(published?.channelCountMode).toBe('explicit')
    expect(context.shapers[0]?.oversample).toBe('2x')

    const trackBefore = gate.processedTrack
    gate.setVolume(4)
    expect(slider?.gain.value, '400% chega no GainNode da faixa publicada').toBe(4)
    expect(gate.processedTrack, 'o slider não troca a faixa').toBe(trackBefore)
    await gate.destroy()
  })

  it('ganho automático mexe no nivelador e não troca a faixa publicada', async () => {
    const holder = { tick: () => undefined }
    installDom(holder)
    const context = new FakeContext()
    const gate = new SensitivityGate(() => -45, () => 1, () => false)
    await gate.init({ audioContext: context, track: fakeTrack(1) } as unknown as AudioProcessorOptions)
    const trackBefore = gate.processedTrack
    expect(context.splitters, 'mono não abre splitter').toEqual([])

    gate.setAutoGain(true)
    const analyser = context.analysers[0]
    if (analyser) analyser.fill = 200
    holder.tick()

    expect(gate.processedTrack, 'ligar o ganho não recaptura').toBe(trackBefore)
    expect(context.gains[0]?.gain.value, 'voz alta desce sem filtro').toBeLessThan(1)
    expect(context.gains[1]?.gain.value, 'o slider continua em 100%').toBe(1)

    gate.setAutoGain(false)
    holder.tick()
    expect(context.gains[0]?.gain.value, 'desligar cola o nivelador em 1').toBe(1)
    await gate.destroy()
  })
})
