/** Volume (RMS 0–1) a partir do qual o anel acende na hora. */
export const SPEAK_ON_LEVEL = 0.02

/** Abaixo disto a voz já acabou; o anel espera um pouco antes de apagar. */
export const SPEAK_OFF_LEVEL = 0.012

/** Segura o verde entre sílabas para o anel não piscar no meio da frase. */
export const SPEAK_HOLD_MS = 160

export interface SpeakState {
  speaking: boolean
  quietMs: number
}

export const SILENT_SPEAK_STATE: SpeakState = { speaking: false, quietMs: 0 }

/**
 * Volume RMS de um buffer do AnalyserNode (bytes em torno de 128 = silêncio).
 * Exemplo: `rmsLevel(new Uint8Array([128, 128]))` devolve `0`.
 */
export function rmsLevel(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let index = 0; index < samples.length; index += 1) {
    const centered = (samples[index] - 128) / 128
    sum += centered * centered
  }
  return Math.sqrt(sum / samples.length)
}

/**
 * Acende no primeiro quadro alto e só apaga depois de um silêncio curto.
 * Exemplo: `stepSpeaking(SILENT_SPEAK_STATE, 0.05, 32).speaking` é `true`.
 */
export function stepSpeaking(state: SpeakState, level: number, elapsedMs: number): SpeakState {
  if (level >= SPEAK_ON_LEVEL) return { speaking: true, quietMs: 0 }
  if (!state.speaking || level >= SPEAK_OFF_LEVEL) return quietOrIdle(state)
  const quietMs = state.quietMs + elapsedMs
  if (quietMs >= SPEAK_HOLD_MS) return SILENT_SPEAK_STATE
  return { speaking: true, quietMs }
}

function quietOrIdle(state: SpeakState): SpeakState {
  if (!state.speaking) return SILENT_SPEAK_STATE
  return { speaking: true, quietMs: 0 }
}
