const SAMPLE_RATE = 48000

/**
 * Transforma o PCM do processo escolhido numa faixa publicável.
 * Exemplo: `const pump = new ScreenAudioPump(); pump.push(bytes)`.
 */
export class ScreenAudioPump {
  readonly track: MediaStreamTrack
  private readonly context = new AudioContext({ sampleRate: SAMPLE_RATE })
  private readonly destination = this.context.createMediaStreamDestination()
  private next = 0
  private pending = new Uint8Array(0)

  constructor() {
    this.track = this.destination.stream.getAudioTracks()[0]
  }

  push(bytes: Uint8Array): void {
    this.pending = concat(this.pending, bytes)
    void this.context.resume()
    this.scheduleReadyFrames()
  }

  close(): void {
    this.track.stop()
    void this.context.close()
  }

  private scheduleReadyFrames(): void {
    const frames = Math.floor(this.pending.length / 4)
    if (frames === 0) return
    const used = frames * 4
    const start = this.playAt(frames)
    scheduleStereo(this.context, this.destination, this.pending.subarray(0, used), start)
    this.pending = this.pending.subarray(used)
  }

  private playAt(frames: number): number {
    const start = Math.max(this.context.currentTime + 0.05, this.next)
    this.next = start + frames / SAMPLE_RATE
    return start
  }
}

function scheduleStereo(
  context: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  bytes: Uint8Array,
  start: number,
): void {
  const frames = bytes.length / 4
  const buffer = context.createBuffer(2, frames, SAMPLE_RATE)
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
}

function concat(left: Uint8Array, right: Uint8Array): Uint8Array {
  const joined = new Uint8Array(left.length + right.length)
  joined.set(left)
  joined.set(right, left.length)
  return joined
}
