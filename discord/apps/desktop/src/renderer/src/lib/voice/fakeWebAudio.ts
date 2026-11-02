/**
 * Contexto de áudio de mentira, compartilhado pelos testes da cadeia.
 * Exemplo: `const context = new FakeAudioContext(); context.createGain()`.
 */
export class FakeAudioParam {
  value = 0
  readonly scheduled: Array<{ value: number; time: number }> = []

  cancelScheduledValues(): void {}

  setValueAtTime(value: number, time = 0): void {
    this.value = value
    this.scheduled.push({ value, time })
  }

  readonly targets: Array<{ value: number; time: number; timeConstant: number }> = []

  setTargetAtTime(value: number, time = 0, timeConstant = 0): void {
    this.value = value
    this.targets.push({ value, time, timeConstant })
  }
}

export class FakeAudioNode {
  readonly outs: Array<{ to: FakeAudioNode; output: number }> = []

  get links(): FakeAudioNode[] {
    return this.outs.map((edge) => edge.to)
  }

  connect(to: FakeAudioNode, output = 0): FakeAudioNode {
    this.outs.push({ to, output })
    return this
  }

  disconnect(): void {
    this.outs.length = 0
  }
}

export class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam()
}

export class FakeWaveShaper extends FakeAudioNode {
  curve: Float32Array<ArrayBuffer> | null = null
  oversample: OverSampleType = 'none'
}

export class FakeAnalyser extends FakeAudioNode {
  fftSize = 0
  fill = 128

  getByteTimeDomainData(buffer: Uint8Array): void {
    buffer.fill(this.fill)
  }

  /** Mesmo nível de `fill`, em float: 128 é silêncio, 200 é 0,5625. */
  getFloatTimeDomainData(buffer: Float32Array): void {
    buffer.fill((this.fill - 128) / 128)
  }
}

export class FakeDestination extends FakeAudioNode {
  channelCount = 2
  channelCountMode: 'max' | 'clamped-max' | 'explicit' = 'max'
  readonly track = { stop(): void {} }
  readonly stream = { getAudioTracks: (): Array<{ stop(): void }> => [this.track] }
}

export class FakeAudioContext {
  sampleRate = 44_100
  currentTime = 1.5
  baseLatency = 0.01
  outputLatency = 0.02
  state: AudioContextState = 'suspended'
  resumed = 0
  closed = 0
  readonly gains: FakeGainNode[] = []
  readonly shapers: FakeWaveShaper[] = []
  readonly analysers: FakeAnalyser[] = []
  readonly splitters: FakeAudioNode[] = []
  readonly sources: FakeAudioNode[] = []
  destinationNode: FakeDestination | null = null
  readonly destination = new FakeDestination()

  resume(): Promise<void> {
    this.resumed += 1
    this.state = 'running'
    return Promise.resolve()
  }

  close(): Promise<void> {
    this.closed += 1
    this.state = 'closed'
    return Promise.resolve()
  }

  createMediaStreamSource(): FakeAudioNode {
    return remember(this.sources, new FakeAudioNode())
  }

  createGain(): FakeGainNode {
    return remember(this.gains, new FakeGainNode())
  }

  createWaveShaper(): FakeWaveShaper {
    return remember(this.shapers, new FakeWaveShaper())
  }

  createAnalyser(): FakeAnalyser {
    return remember(this.analysers, new FakeAnalyser())
  }

  createChannelSplitter(): FakeAudioNode {
    return remember(this.splitters, new FakeAudioNode())
  }

  createMediaStreamDestination(): FakeDestination {
    this.destinationNode = new FakeDestination()
    return this.destinationNode
  }
}

export function fakeMediaTrack(channelCount = 1): MediaStreamTrack {
  return {
    kind: 'audio',
    label: 'mic-teste',
    stop: () => undefined,
    getSettings: () => ({ channelCount, deviceId: 'default' }),
  } as unknown as MediaStreamTrack
}

function remember<T>(list: T[], node: T): T {
  list.push(node)
  return node
}
