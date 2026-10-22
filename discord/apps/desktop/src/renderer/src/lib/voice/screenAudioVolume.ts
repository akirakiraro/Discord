export interface VolumeTrack {
  setVolume(volume: number): void
}

/** Escuta da própria tela. Os outros recebem o áudio cheio, sem passar por aqui. */
export const OWN_SCREEN_LISTEN = 0

/** Escuta da tela de outra pessoa. */
export const REMOTE_SCREEN_LISTEN = 1

export type ScreenVolumeTarget = 'own' | 'remote'

/**
 * O slider mexe na própria tela só quando ninguém mais está compartilhando áudio.
 * Exemplo: `volumeTarget(true, true)` devolve `'remote'`.
 */
export function volumeTarget(hearingOwn: boolean, hearingRemote: boolean): ScreenVolumeTarget {
  if (hearingRemote) return 'remote'
  return 'own'
}

/**
 * Mantém o volume da tela entre mudo e o máximo do elemento de áudio.
 * Exemplo: `clampUnitVolume(1.4)` devolve `1`.
 */
export function clampUnitVolume(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(1, Math.max(0, value))
}

/**
 * Aplica o volume escolhido na faixa de áudio da tela.
 * Exemplo: `applyScreenVolume(track, 0.4)`.
 */
export function applyScreenVolume(track: VolumeTrack | undefined, volume: number): void {
  track?.setVolume(clampUnitVolume(volume))
}
