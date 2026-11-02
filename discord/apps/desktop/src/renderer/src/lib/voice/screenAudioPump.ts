const CAPTURE_RATE = 48000
const LEAD_SECONDS = 0.02

let shared: AudioContext | null = null

/**
 * Contexto único da tela. Criar outro a cada compartilhamento reinicia a placa e estala o som.
 * Exemplo: `warmScreenAudio()` ao entrar no palco de voz.
 */
export function warmScreenAudio(): void {
  const context = screenAudioContext()
  void context.resume()
}

/**
 * Transforma o PCM do processo escolhido numa faixa publicável.
 * Exemplo: `const pump = new ScreenAudioPump(); pump.push(bytes)`.
 */
export class ScreenAudioPump {
  readonly track: MediaStreamTrack
  private readonly context = screenAudioContext()
  private readonly destination = this.context.createMediaStreamDestination()
  private next = 0
  private pending = new Uint8Array(0)
  private readonly playing = new Set<AudioBufferSourceNode>()

  constructor() {
    const track = this.destination.stream.getAudioTracks()[0]
    if (!track) throw new Error('destino de áudio da tela sem faixa; esperado um MediaStreamTrack')
    this.track = track
    void this.context.resume()
  }

  push(bytes: Uint8Array): void {
    this.pending = concat(this.pending, bytes)
    this.scheduleReadyFrames()
  }

  close(): void {
    for (const source of this.playing) source.stop()
    this.playing.clear()
    this.track.stop()
    this.destination.disconnect()
  }

  private scheduleReadyFrames(): void {
    const frames = Math.floor(this.pending.length / 4)
    if (frames === 0) return
    const used = frames * 4
    const start = this.playAt(frames)
    const source = scheduleStereo(this.context, this.destination, this.pending.subarray(0, used), start)
    logPlayback(this.context, frames, start)
    this.playing.add(source)
    source.onended = () => this.playing.delete(source)
    this.pending = this.pending.subarray(used)
  }

  private playAt(frames: number): number {
    const start = Math.max(this.context.currentTime + LEAD_SECONDS, this.next)
    this.next = start + frames / CAPTURE_RATE
    return start
  }
}

function logPlayback(context: AudioContext, frames: number, start: number): void {
  const lateMs = Math.round((context.currentTime + 0.02 - start) * 1000)
  if (frames < 24000 && lateMs < 80) return
  window.radcord?.logScreenAudio('playback_burst', {
    sampleRate: context.sampleRate,
    frames,
    lateMs,
  })
}
function screenAudioContext(): AudioContext {
  shared ??= new AudioContext()
  return shared
}

function scheduleStereo(
  context: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  bytes: Uint8Array,
  start: number,
): AudioBufferSourceNode {
  const frames = bytes.length / 4
  const buffer = context.createBuffer(2, frames, CAPTURE_RATE)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let frame = 0; frame < frames; frame += 1) {
    left[frame] = view.getInt16(frame * 4, true) / 32768
    right[frame] = view.getInt16(frame * 4 + 2, true) / 32768
  }
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(destination)
  source.start(start)
  return source
}

function concat(left: Uint8Array, right: Uint8Array): Uint8Array<ArrayBuffer> {
  const joined = new Uint8Array(new ArrayBuffer(left.length + right.length))
  joined.set(left)
  joined.set(right, left.length)
  return joined
}
