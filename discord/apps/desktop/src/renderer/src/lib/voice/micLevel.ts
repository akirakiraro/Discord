/** Escala da barra, em dBFS. Silêncio fica na esquerda. */
export const METER_MIN_DB = -80
export const METER_MAX_DB = 0

/** O portão vai de quase tudo passa (−80) até só voz alta (−10). */
export const GATE_MIN_DB = -80
export const GATE_MAX_DB = -10
export const DEFAULT_GATE_DB = -45

/** Segura o portão aberto entre sílabas para não cortar a palavra. */
export const GATE_HOLD_MS = 200

export interface GateState {
  open: boolean
  quietMs: number
}

export const CLOSED_GATE: GateState = { open: false, quietMs: 0 }

/**
 * RMS 0–1 em dBFS. Silêncio encosta em −80 dB, que é o começo da barra.
 * Exemplo: `rmsToDb(0.1)` fica perto de −20.
 */
export function rmsToDb(rms: number): number {
  if (!Number.isFinite(rms) || rms <= 0) return METER_MIN_DB
  return 20 * Math.log10(rms)
}

/**
 * Mantém o portão entre −80 dB e −10 dB.
 * Exemplo: `clampGateDb(-5)` devolve `-10`.
 */
export function clampGateDb(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_GATE_DB
  return Math.min(GATE_MAX_DB, Math.max(GATE_MIN_DB, value))
}

/**
 * Posição na barra para um nível ou para o traço do portão.
 * Exemplo: `dbToPercent(-40)` fica na metade da escala de −80 a 0.
 */
export function dbToPercent(db: number): number {
  const clamped = Math.min(METER_MAX_DB, Math.max(METER_MIN_DB, db))
  return Math.round(((clamped - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB)) * 100)
}

/**
 * Abre quando o nível chega no limite e fecha depois de um silêncio curto.
 * Exemplo: `stepGate(CLOSED_GATE, -20, -45, 32).open` é `true`.
 */
export function stepGate(state: GateState, levelDb: number, thresholdDb: number, elapsedMs: number): GateState {
  if (levelDb >= thresholdDb) return { open: true, quietMs: 0 }
  if (!state.open) return CLOSED_GATE
  const quietMs = state.quietMs + elapsedMs
  if (quietMs >= GATE_HOLD_MS) return CLOSED_GATE
  return { open: true, quietMs }
}
