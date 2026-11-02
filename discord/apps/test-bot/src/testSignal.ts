import type { PcmClip } from './wav'

export const TEST_SAMPLE_RATE = 48_000

interface Phrase {
  /** Nível RMS da "fala", em dBFS. */
  db: number
  speakMs: number
  pauseMs: number
}

/**
 * Frases de mentira: voz normal, voz baixa no limite do portão e uma pausa longa.
 * A voz baixa (−50 dB) é o caso que o portão antigo, em byte, não enxergava.
 */
const PHRASES: readonly Phrase[] = [
  { db: -20, speakMs: 1400, pauseMs: 500 },
  { db: -30, speakMs: 900, pauseMs: 350 },
  { db: -50, speakMs: 900, pauseMs: 1200 },
  { db: -20, speakMs: 600, pauseMs: 250 },
  { db: -20, speakMs: 600, pauseMs: 1500 },
]

const FUNDAMENTAL_HZ = 140
const HARMONICS = [1, 0.6, 0.4, 0.25, 0.15, 0.08] as const
const SYLLABLE_HZ = 4
const EDGE_MS = 15

/**
 * Sinal parecido com fala: tom grave com harmônicos, sílabas de 250 ms e pausas.
 * Não é voz humana; serve para ver o portão, o anel e o volume reagirem.
 * Exemplo: `speechLikeClip().samples.length` dá uns 8 s a 48 kHz.
 */
export function speechLikeClip(sampleRate = TEST_SAMPLE_RATE): PcmClip {
  const parts = PHRASES.flatMap((phrase) => [voiced(phrase, sampleRate), silence(phrase.pauseMs, sampleRate)])
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const samples = new Int16Array(total)
  let offset = 0
  for (const part of parts) {
    samples.set(part, offset)
    offset += part.length
  }
  return { sampleRate, samples }
}

/** Fator de pico para um RMS alvo do tom com estes harmônicos. Exemplo: `rmsOfHarmonics()`. */
export function rmsOfHarmonics(): number {
  const power = HARMONICS.reduce((sum, amplitude) => sum + amplitude * amplitude, 0) / 2
  return Math.sqrt(power)
}

function voiced(phrase: Phrase, sampleRate: number): Int16Array {
  const length = Math.round((phrase.speakMs / 1000) * sampleRate)
  const out = new Int16Array(length)
  // A sílaba sobe e desce (seno ao quadrado tem RMS 0,61): compensa para o RMS da fala ficar no alvo.
  const scale = (10 ** (phrase.db / 20)) / (rmsOfHarmonics() * Math.sqrt(3 / 8))
  const edge = Math.max(1, Math.round((EDGE_MS / 1000) * sampleRate))
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate
    const syllable = Math.sin(Math.PI * SYLLABLE_HZ * time) ** 2
    const fade = Math.min(1, index / edge, (length - 1 - index) / edge)
    out[index] = toInt16(scale * syllable * fade * tone(time))
  }
  return out
}

function tone(time: number): number {
  let value = 0
  HARMONICS.forEach((amplitude, index) => {
    value += amplitude * Math.sin(2 * Math.PI * FUNDAMENTAL_HZ * (index + 1) * time)
  })
  return value
}

function silence(ms: number, sampleRate: number): Int16Array {
  return new Int16Array(Math.round((ms / 1000) * sampleRate))
}

function toInt16(value: number): number {
  const clamped = Math.max(-1, Math.min(1, value))
  return Math.round(clamped * 32767)
}
