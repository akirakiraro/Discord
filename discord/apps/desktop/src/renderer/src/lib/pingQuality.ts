export type PingQuality = 'good' | 'fair' | 'poor' | 'offline'

// Acima de ~120 ms costuma indicar que o Radmin caiu para conexão "relay".
const GOOD_PING_MAX_MS = 60
const FAIR_PING_MAX_MS = 120

/**
 * Classifica o ping até o host para pintar o indicador de conexão.
 * Exemplo: `classifyPing(35)` → `'good'`
 */
export function classifyPing(pingMs: number | null): PingQuality {
  if (pingMs === null) return 'offline'
  if (pingMs <= GOOD_PING_MAX_MS) return 'good'
  if (pingMs <= FAIR_PING_MAX_MS) return 'fair'
  return 'poor'
}
