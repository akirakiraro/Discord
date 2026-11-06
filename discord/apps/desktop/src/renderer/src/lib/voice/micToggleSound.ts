import type { MicDeafenState } from './micDeafen'

/** Clique local de mutar, desmutar, ensurdecer ou desensurdecer. Não entra na sala. */
export type ToggleSound = 'mute' | 'unmute' | 'deafen' | 'undeafen'

export interface ToggleNote {
  hz: number
  start: number
  duration: number
}

const MUTE: readonly ToggleNote[] = [
  { hz: 392, start: 0, duration: 0.06 },
  { hz: 294, start: 0.05, duration: 0.08 },
]

const UNMUTE: readonly ToggleNote[] = [
  { hz: 330, start: 0, duration: 0.05 },
  { hz: 494, start: 0.045, duration: 0.07 },
]

const DEAFEN: readonly ToggleNote[] = [
  { hz: 247, start: 0, duration: 0.07 },
  { hz: 175, start: 0.06, duration: 0.1 },
]

const UNDEAFEN: readonly ToggleNote[] = [
  { hz: 220, start: 0, duration: 0.05 },
  { hz: 370, start: 0.045, duration: 0.08 },
]

const NOTES: Record<ToggleSound, readonly ToggleNote[]> = {
  mute: MUTE,
  unmute: UNMUTE,
  deafen: DEAFEN,
  undeafen: UNDEAFEN,
}

/**
 * Som do clique no microfone. Surdo sai por esse botão: o clique volta a ouvir.
 * Exemplo: `micToggleSound({ micMuted: false, deafened: false })` é `mute`.
 */
export function micToggleSound(state: Pick<MicDeafenState, 'micMuted' | 'deafened'>): ToggleSound {
  if (state.deafened) return 'undeafen'
  return state.micMuted ? 'unmute' : 'mute'
}

/**
 * Som do clique em ensurdecer. O mute guardado não troca o bip.
 * Exemplo: `deafenToggleSound({ deafened: true })` é `undeafen`.
 */
export function deafenToggleSound(state: Pick<MicDeafenState, 'deafened'>): ToggleSound {
  return state.deafened ? 'undeafen' : 'deafen'
}

/**
 * Cópia das notas, para o tocador não alterar a tabela.
 * Exemplo: `toggleNotes('mute')[0].hz` é `392`.
 */
export function toggleNotes(kind: ToggleSound): ToggleNote[] {
  return NOTES[kind].map((note) => ({ ...note }))
}

/**
 * Segundos até a última nota acabar.
 * Exemplo: `toggleSpan(toggleNotes('deafen'))` é menor que `0.25`.
 */
export function toggleSpan(notes: readonly ToggleNote[]): number {
  return notes.reduce((max, note) => Math.max(max, note.start + note.duration), 0)
}
