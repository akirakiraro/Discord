import { AudioFrame, type AudioSource } from '@livekit/rtc-node'
import { framesOf } from './frames'
import type { PcmClip } from './wav'

/**
 * Toca um clipe no AudioSource, uma vez ou em loop, até `stop()`.
 * O `captureFrame` espera a fila andar, então o ritmo é o do tempo real.
 * Exemplo: `const playing = playClip(source, clip, true); playing.stop()`
 */
export function playClip(source: AudioSource, clip: PcmClip, loop: boolean): { done: Promise<void>; stop(): void } {
  let stopped = false
  const done = (async () => {
    do {
      for (const frame of framesOf(clip.samples, clip.sampleRate)) {
        if (stopped) return
        await source.captureFrame(new AudioFrame(frame, clip.sampleRate, 1, frame.length))
      }
    } while (loop && !stopped)
  })()
  return {
    done,
    stop: () => {
      stopped = true
      source.clearQueue()
    },
  }
}
