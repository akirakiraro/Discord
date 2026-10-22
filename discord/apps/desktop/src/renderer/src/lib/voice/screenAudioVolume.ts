export interface VolumeTrack {
  setVolume(volume: number): void
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
