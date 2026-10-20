import { Track, type AudioProcessorOptions, type TrackProcessor } from 'livekit-client'
import { clampInputGain } from './micPreferences'

interface GainNodes {
  source: MediaStreamAudioSourceNode
  gain: GainNode
  destination: MediaStreamAudioDestinationNode
}

/**
 * Multiplica o volume do microfone depois da captura do LiveKit.
 * A supressão de ruído continua no navegador; isto só é a sensibilidade.
 * Exemplo: `processor.setGain(1.5)` deixa a voz 50% mais alta.
 */
export class InputGainProcessor implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
  name = 'radcord-input-gain'
  processedTrack?: MediaStreamTrack
  appliedGain = 1
  private nodes?: GainNodes

  constructor(private readonly readGain: () => number) {
    this.appliedGain = clampInputGain(readGain())
  }

  async init(opts: AudioProcessorOptions): Promise<void> {
    await this.destroy()
    this.wire(opts)
  }

  async restart(opts: AudioProcessorOptions): Promise<void> {
    await this.destroy()
    this.wire(opts)
  }

  /** Atualiza o `GainNode` já ligado, sem recapturar o microfone. */
  setGain(value: number): void {
    this.appliedGain = clampInputGain(value)
    if (this.nodes) this.nodes.gain.gain.value = this.appliedGain
  }

  async destroy(): Promise<void> {
    this.nodes?.source.disconnect()
    this.nodes?.gain.disconnect()
    this.processedTrack?.stop()
    this.nodes = undefined
    this.processedTrack = undefined
  }

  private wire(opts: AudioProcessorOptions): void {
    const context = audioContextOf(opts)
    const source = context.createMediaStreamSource(new MediaStream([opts.track]))
    const gain = context.createGain()
    const destination = context.createMediaStreamDestination()
    this.appliedGain = clampInputGain(this.readGain())
    gain.gain.value = this.appliedGain
    source.connect(gain)
    gain.connect(destination)
    this.nodes = { source, gain, destination }
    this.processedTrack = destination.stream.getAudioTracks()[0]
  }
}

function audioContextOf(opts: AudioProcessorOptions): AudioContext {
  if (!opts.audioContext) {
    throw new Error('AudioContext ausente ao ligar o ganho do microfone; esperado AudioProcessorOptions.audioContext')
  }
  return opts.audioContext
}
