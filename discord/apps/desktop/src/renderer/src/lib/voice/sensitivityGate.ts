import { Track, type AudioProcessorOptions, type TrackProcessor } from 'livekit-client'
import { clampInputGain } from './micPreferences'
import { CLOSED_GATE, clampGateDb, rmsToDb, stepGate, type GateState } from './micLevel'
import { aimGain, aimGateOpen, createMicChain, followLeveler, limiterAttenuation, peakSample, readChainRms, setSliderGain, type MicChain } from './micGain'
import type { MicChainReading } from './probeChain'

const TICK_MS = 32

interface GateNodes {
  chain: MicChain
  destination: MediaStreamAudioDestinationNode
  state: GateState
  autoGain: boolean
}

/**
 * Portão do microfone: abaixo do limite em dB o som não segue para a chamada.
 * O volume e o nivelador ficam antes do portão. 1 no slider é o microfone cru.
 * Exemplo: `gate.setVolume(2)` deixa a voz duas vezes mais alta, sem recapturar.
 */
export class SensitivityGate implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
  name = 'radcord-sensitivity-gate'
  processedTrack?: MediaStreamTrack
  thresholdDb: number
  inputGain: number
  autoGain = false
  levelDb = -80
  private nodes?: GateNodes
  private timer?: number

  constructor(
    private readonly readThreshold: () => number,
    private readonly readGain: () => number,
    private readonly readAutoGain: () => boolean = () => false,
  ) {
    this.thresholdDb = clampGateDb(readThreshold())
    this.inputGain = clampInputGain(readGain())
    this.autoGain = readAutoGain()
  }

  get listening(): boolean {
    return this.nodes !== undefined
  }

  /**
   * Leitura local da cadeia, para o painel de debug. Não publica nada.
   * Exemplo: `gate.debugSnapshot()?.gateOpen`.
   */
  debugSnapshot(): MicChainReading | null {
    const nodes = this.nodes
    if (!nodes) return null
    return readingOf(this, nodes)
  }

  async init(opts: AudioProcessorOptions): Promise<void> {
    await this.destroy()
    this.wire(opts)
  }

  async restart(opts: AudioProcessorOptions): Promise<void> {
    await this.destroy()
    this.wire(opts)
  }

  /** Move o limite sem recapturar o microfone. */
  setThreshold(value: number): void {
    this.thresholdDb = clampGateDb(value)
  }

  /** Ajusta o volume antes do portão, sem recapturar. 1 não altera. */
  setVolume(value: number): void {
    this.inputGain = clampInputGain(value)
    if (!this.nodes) return
    setSliderGain(this.nodes.chain, this.inputGain)
  }

  /**
   * Liga o nivelador nosso. Não pede `autoGainControl` ao Chromium:
   * esse módulo reabre o processamento que abafa.
   * Exemplo: `gate.setAutoGain(true)`.
   */
  setAutoGain(enabled: boolean): void {
    this.autoGain = enabled
    if (!this.nodes) return
    this.nodes.autoGain = enabled
    if (enabled) return
    this.nodes.chain.levelerGain = 1
    aimGain(this.nodes.chain.leveler.gain, 1, this.nodes.chain.context.currentTime)
  }

  async destroy(): Promise<void> {
    if (this.timer !== undefined) window.clearInterval(this.timer)
    this.nodes?.chain.source.disconnect()
    this.processedTrack?.stop()
    this.timer = undefined
    this.nodes = undefined
    this.processedTrack = undefined
  }

  private wire(opts: AudioProcessorOptions): void {
    const context = audioContextOf(opts)
    this.inputGain = clampInputGain(this.readGain())
    this.autoGain = this.readAutoGain()
    const chain = createMicChain(context, opts.track, this.inputGain)
    const destination = context.createMediaStreamDestination()
    forceMonoOutput(destination)
    chain.gate.connect(destination)
    this.nodes = { chain, destination, state: CLOSED_GATE, autoGain: this.autoGain }
    this.processedTrack = outputTrack(destination)
    this.timer = window.setInterval(() => this.tick(), TICK_MS)
  }

  private tick(): void {
    const nodes = this.nodes
    if (!nodes) return
    const post = readChainRms(nodes.chain)
    this.levelDb = rmsToDb(post)
    followLeveler(nodes.chain, post, nodes.autoGain)
    this.followGate(nodes)
  }

  private followGate(nodes: GateNodes): void {
    const next = stepGate(nodes.state, this.levelDb, this.thresholdDb, TICK_MS)
    if (next.open !== nodes.state.open) aimGateOpen(nodes.chain.gate.gain, next.open, nodes.chain.context.currentTime)
    nodes.state = next
  }
}

function readingOf(gate: SensitivityGate, nodes: GateNodes): MicChainReading {
  const chain = nodes.chain
  chain.analyser.getFloatTimeDomainData(chain.samples)
  return {
    sliderGain: chain.sliderGain,
    levelerGain: chain.levelerGain,
    limiterAttenuation: limiterAttenuation(peakSample(chain.samples)),
    gateOpen: nodes.state.open,
    levelDb: gate.levelDb,
    thresholdDb: gate.thresholdDb,
    autoGain: nodes.autoGain,
    sampleRate: chain.context.sampleRate,
    baseLatencySec: chain.context.baseLatency,
    outputLatencySec: chain.context.outputLatency,
  }
}

function audioContextOf(opts: AudioProcessorOptions): AudioContext {
  if (!opts.audioContext) {
    throw new Error('AudioContext ausente ao ligar o portão do microfone; esperado AudioProcessorOptions.audioContext')
  }
  return opts.audioContext
}

/**
 * O destino do Web Audio nasce estéreo. O Opus divide o bitrate entre os canais
 * e a voz, que é um canal só, perde agudo. Um canal usa o bitrate inteiro.
 * Exemplo: `forceMonoOutput(context.createMediaStreamDestination())`
 */
export function forceMonoOutput(sink: MonoOutputSink): void {
  sink.channelCountMode = 'explicit'
  sink.channelCount = 1
}

interface MonoOutputSink {
  channelCount: number
  channelCountMode: 'max' | 'clamped-max' | 'explicit'
}

function outputTrack(destination: MediaStreamAudioDestinationNode): MediaStreamTrack {
  const track = destination.stream.getAudioTracks()[0]
  if (!track) throw new Error('portão sem faixa de saída; esperado um MediaStreamTrack de áudio')
  return track
}
