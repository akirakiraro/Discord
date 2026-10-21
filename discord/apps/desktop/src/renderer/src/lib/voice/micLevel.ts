/** RMS que enche a barra. Voz normal fica no meio; ruído baixo fica no começo. */
const LEVEL_FULL_SCALE = 0.2

/**
 * Converte o volume RMS (0–1) em porcentagem da barra.
 * Exemplo: `micLevelPercent(0.1)` devolve `50`.
 */
export function micLevelPercent(level: number): number {
  if (!Number.isFinite(level) || level <= 0) return 0
  return Math.round(Math.min(100, (level / LEVEL_FULL_SCALE) * 100))
}
