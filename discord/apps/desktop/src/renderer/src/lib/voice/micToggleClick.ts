import { useVoiceStore } from '../../stores/voiceStore'
import { MicTogglePlayer } from './micTogglePlayer'
import { deafenToggleSound, micToggleSound, type ToggleSound } from './micToggleSound'

export interface ToggleSoundPlayer {
  play(kind: ToggleSound): void
}

/** Um contexto por app. O clique reusa; a sala do LiveKit não vê esse objeto. */
export const micTogglePlayer: ToggleSoundPlayer = new MicTogglePlayer()

/**
 * Clique em mutar: bip neste PC e só então o estado. Quem está na call não ouve o bip.
 * Exemplo: `onClick={() => clickMute()}`. O evento do React não pode ir no primeiro argumento.
 */
export function clickMute(player: ToggleSoundPlayer = micTogglePlayer): void {
  playThenToggle(player, micToggleSound(useVoiceStore.getState()), () => useVoiceStore.getState().toggleMic())
}

/**
 * Clique em ensurdecer. O bip toca mesmo no instante em que o surdo cala a call.
 * Exemplo: `onClick={() => clickDeafen()}`.
 */
export function clickDeafen(player: ToggleSoundPlayer = micTogglePlayer): void {
  playThenToggle(player, deafenToggleSound(useVoiceStore.getState()), () => useVoiceStore.getState().toggleDeafen())
}

function playThenToggle(player: ToggleSoundPlayer, kind: ToggleSound, toggle: () => void): void {
  try {
    player.play(kind)
  } catch {
    // O bip falhou. O botão continua valendo.
  }
  toggle()
}
