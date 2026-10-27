/** 10 ms por quadro, o tamanho que o LiveKit espera do AudioSource. */
export const FRAME_MS = 10

/**
 * Corta o clipe em quadros de 10 ms. O último é completado com silêncio.
 * Exemplo: `[...framesOf(samples, 48000)][0].length` é `480`.
 */
export function* framesOf(samples: Int16Array, sampleRate: number): Generator<Int16Array> {
  const size = frameSize(sampleRate)
  for (let start = 0; start < samples.length; start += size) {
    const frame = new Int16Array(size)
    frame.set(samples.subarray(start, Math.min(samples.length, start + size)))
    yield frame
  }
}

/** Exemplo: `frameSize(44100)` devolve `441`. */
export function frameSize(sampleRate: number): number {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000) {
    throw new Error(`taxa ${sampleRate} inválida; esperado inteiro a partir de 8000 Hz`)
  }
  return Math.round((sampleRate * FRAME_MS) / 1000)
}
