import { Track, type AudioProcessorOptions, type TrackProcessor } from 'livekit-client'
import { CLOSED_GATE, clampGateDb, rmsToDb, stepGate, type GateState } from './micLevel'
import { rmsLevel } from './speakingLevel'

const TICK_MS = 32

interface GateNodes {
  source: MediaStreamAudioSourceNode
  gain: GainNode
  analyser: AnalyserNode
  destination: MediaStreamAudioDestinationNode
  context: AudioContext
  samples: Uint8Array<ArrayBuffer>
  state: GateState
}

/**
 * Portão do microfone: abaixo do limite em dB o som não segue para a chamada.
 * O nível lido aqui é o de antes do portão, para a barra mostrar ruído e voz.
 * Exemplo: `gate.setThreshold(-50)` barra o que estiver mais baixo que −50 dB.
 */
export class SensitivityGate implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
  name = 'radcord-sensitivity-gate'
  processedTrack?: MediaStreamTrack
  thresholdDb: number
  levelDb = -80
  private nodes?: GateNodes
  private timer?: number

  constructor(private readonly readThreshold: () => number) {
    this.thresholdDb = clampGateDb(readThreshold())
  }

  get listening(): boolean {
    return this.nodes !== undefined
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

  async destroy(): Promise<void> {
    if (this.timer !== undefined) window.clearInterval(this.timer)
    this.nodes?.source.disconnect()
    this.nodes?.gain.disconnect()
    this.processedTrack?.stop()
    this.timer = undefined
    this.nodes = undefined
    this.processedTrack = undefined
  }

  private wire(opts: AudioProcessorOptions): void {
    this.nodes = connectGate(audioContextOf(opts), opts.track)
    this.thresholdDb = clampGateDb(this.readThreshold())
    this.processedTrack = outputTrack(this.nodes.destination)
    this.timer = window.setInterval(() => this.tick(), TICK_MS)
  }

  private tick(): void {
    const nodes = this.nodes
    if (!nodes) return
    nodes.analyser.getByteTimeDomainData(nodes.samples)
    this.levelDb = rmsToDb(rmsLevel(nodes.samples))
    const next = stepGate(nodes.state, this.levelDb, this.thresholdDb, TICK_MS)
    if (next.open !== nodes.state.open) aimGate(nodes.gain, nodes.context, next.open)
    nodes.state = next
  }
}

function audioContextOf(opts: AudioProcessorOptions): AudioContext {
  if (!opts.audioContext) {
    throw new Error('AudioContext ausente ao ligar o portão do microfone; esperado AudioProcessorOptions.audioContext')
  }
  return opts.audioContext
}

function connectGate(context: AudioContext, track: MediaStreamTrack): GateNodes {
  const source = context.createMediaStreamSource(new MediaStream([track]))
  const gain = context.createGain()
  const analyser = context.createAnalyser()
  const destination = context.createMediaStreamDestination()
  analyser.fftSize = 512
  gain.gain.value = 0
  source.connect(analyser)
  source.connect(gain)
  gain.connect(destination)
  const samples = new Uint8Array(new ArrayBuffer(analyser.fftSize))
  return { source, gain, analyser, destination, context, samples, state: CLOSED_GATE }
}

function outputTrack(destination: MediaStreamAudioDestinationNode): MediaStreamTrack {
  const track = destination.stream.getAudioTracks()[0]
  if (!track) throw new Error('portão sem faixa de saída; esperado um MediaStreamTrack de áudio')
  return track
}

function aimGate(gain: GainNode, context: AudioContext, open: boolean): void {
  const now = context.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setTargetAtTime(open ? 1 : 0, now, 0.01)
}
