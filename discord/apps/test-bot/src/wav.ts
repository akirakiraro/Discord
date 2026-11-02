export interface PcmClip {
  sampleRate: number
  /** Mono, 16 bits. Estéreo vira a média dos dois canais. */
  samples: Int16Array
}

/**
 * Lê um WAV PCM de 16 bits (mono ou estéreo). Outro formato é recusado com o motivo.
 * Exemplo: `parseWav(readFileSync('fala.wav')).sampleRate`
 */
export function parseWav(bytes: Uint8Array): PcmClip {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (text(bytes, 0, 4) !== 'RIFF' || text(bytes, 8, 4) !== 'WAVE') {
    throw new Error(`arquivo não é WAV: cabeçalho ${JSON.stringify(text(bytes, 0, 4))}, esperado "RIFF"/"WAVE"`)
  }
  const format = findChunk(bytes, view, 'fmt ')
  const data = findChunk(bytes, view, 'data')
  const audioFormat = view.getUint16(format.start, true)
  const channels = view.getUint16(format.start + 2, true)
  const sampleRate = view.getUint32(format.start + 4, true)
  const bits = view.getUint16(format.start + 14, true)
  if (audioFormat !== 1 || bits !== 16) {
    throw new Error(`WAV com formato ${audioFormat} e ${bits} bits; esperado PCM (1) de 16 bits`)
  }
  if (channels !== 1 && channels !== 2) throw new Error(`WAV com ${channels} canais; esperado 1 ou 2`)
  return { sampleRate, samples: monoSamples(view, data, channels) }
}

/**
 * Monta um WAV mono de 16 bits. Serve aos testes e para salvar o sinal de teste.
 * Exemplo: `encodeWav({ sampleRate: 48000, samples })`
 */
export function encodeWav(clip: PcmClip): Uint8Array {
  const dataBytes = clip.samples.length * 2
  const bytes = new Uint8Array(44 + dataBytes)
  const view = new DataView(bytes.buffer)
  writeText(bytes, 0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  writeText(bytes, 8, 'WAVE')
  writeText(bytes, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, clip.sampleRate, true)
  view.setUint32(28, clip.sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(bytes, 36, 'data')
  view.setUint32(40, dataBytes, true)
  clip.samples.forEach((sample, index) => view.setInt16(44 + index * 2, sample, true))
  return bytes
}

interface Chunk {
  start: number
  size: number
}

function findChunk(bytes: Uint8Array, view: DataView, id: string): Chunk {
  let offset = 12
  while (offset + 8 <= bytes.byteLength) {
    const size = view.getUint32(offset + 4, true)
    if (text(bytes, offset, 4) === id) return { start: offset + 8, size: Math.min(size, bytes.byteLength - offset - 8) }
    offset += 8 + size + (size % 2)
  }
  throw new Error(`WAV sem o bloco ${JSON.stringify(id)}`)
}

function monoSamples(view: DataView, data: Chunk, channels: number): Int16Array {
  const frames = Math.floor(data.size / (2 * channels))
  const out = new Int16Array(frames)
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0
    for (let channel = 0; channel < channels; channel += 1) sum += view.getInt16(data.start + (frame * channels + channel) * 2, true)
    out[frame] = Math.round(sum / channels)
  }
  return out
}

function text(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length))
}

function writeText(bytes: Uint8Array, start: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) bytes[start + index] = value.charCodeAt(index)
}
