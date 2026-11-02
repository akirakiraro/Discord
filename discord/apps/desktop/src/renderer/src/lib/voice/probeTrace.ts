export const PROBE_HISTORY_LIMIT = 60
export const PROBE_EVENT_LIMIT = 40

export type ProbeEventKind = 'entrou' | 'saiu' | 'reconectou' | 'transporte' | 'microfone'

export interface ProbePoint {
  atMs: number
  loss: number | null
  jitterMs: number | null
  bitrate: number | null
}

export type ProbeHistory = Record<string, ProbePoint[]>

export interface ProbeEvent {
  atMs: number
  kind: ProbeEventKind
  detail: string
}

export interface ProbeNamed {
  key: string
  name: string
}

export interface ProbeDump {
  lidoEm: string
  faixas: unknown
  captura: unknown
  cadeia: unknown
  volumes: unknown
  contexto: unknown
  historico: ProbeHistory
  eventos: ProbeEvent[]
}

/**
 * Guarda no máximo 60 pontos, o segundo mais antigo sai primeiro.
 * Exemplo: `pushProbePoint({}, 'bia', ponto, 60)`.
 */
export function pushProbePoint(history: ProbeHistory, key: string, point: ProbePoint, limit = PROBE_HISTORY_LIMIT): ProbeHistory {
  const series = history[key] ?? []
  const next = series.length >= limit ? [...series.slice(series.length - limit + 1), point] : [...series, point]
  return { ...history, [key]: next }
}

/** Tira do gráfico quem saiu da call. Exemplo: `trimProbeHistory(history, ['bia'])`. */
export function trimProbeHistory(history: ProbeHistory, keys: readonly string[]): ProbeHistory {
  const next: ProbeHistory = {}
  for (const key of keys) {
    const series = history[key]
    if (series) next[key] = series
  }
  return next
}

/** Exemplo: `appendProbeEvents([], [evento], 40)`. */
export function appendProbeEvents(log: readonly ProbeEvent[], added: readonly ProbeEvent[], limit = PROBE_EVENT_LIMIT): ProbeEvent[] {
  if (added.length === 0) return [...log]
  const next = [...log, ...added]
  return next.length > limit ? next.slice(next.length - limit) : next
}

/**
 * A primeira leitura não finge que todo mundo acabou de entrar.
 * Exemplo: `membershipEvents(null, [{ key: 'a', name: 'Bia' }], 0)` é `[]`.
 */
export function membershipEvents(
  previous: readonly string[] | null,
  current: readonly ProbeNamed[],
  atMs: number,
  previousNames: Readonly<Record<string, string>> = {},
): ProbeEvent[] {
  if (previous === null) return []
  const names = new Map(current.map((person) => [person.key, person.name]))
  const entered = current.filter((person) => !previous.includes(person.key)).map((person) => eventOf(atMs, 'entrou', person.name))
  const left = previous.filter((key) => !names.has(key)).map((key) => eventOf(atMs, 'saiu', previousNames[key] ?? key))
  return [...entered, ...left]
}

/** Exemplo: `transportEvents({ bia: 'UDP · direto' }, [{ key: 'bia', name: 'Bia', transport: 'TCP · relay' }], 0)`. */
export function transportEvents(
  previous: Readonly<Record<string, string>>,
  current: ReadonlyArray<{ key: string; name: string; transport: string }>,
  atMs: number,
): ProbeEvent[] {
  return current.flatMap((person) => transportEvent(previous[person.key], person, atMs))
}

/** Exemplo: `deviceEvent('Mic A', 'Mic B', 0)?.kind` é `'microfone'`. */
export function deviceEvent(previous: string | null, next: string | null, atMs: number): ProbeEvent | null {
  if (previous === null || next === null || previous === next) return null
  return eventOf(atMs, 'microfone', `${previous} → ${next}`)
}

/** Exemplo: `formatProbeClock(0)` tem a forma `hh:mm:ss`. */
export function formatProbeClock(atMs: number): string {
  const date = new Date(atMs)
  return [date.getHours(), date.getMinutes(), date.getSeconds()].map(padClock).join(':')
}

/**
 * Pontos de uma polilinha. Valor ausente fica fora do traço.
 * Exemplo: `sparklinePoints([0, 1], 10, 10)` devolve `'0,10 10,0'`.
 */
export function sparklinePoints(values: ReadonlyArray<number | null>, width: number, height: number): string {
  const peak = Math.max(0, ...values.filter((value): value is number => value !== null))
  const span = peak === 0 ? 1 : peak
  const step = values.length <= 1 ? 0 : width / (values.length - 1)
  return values.map((value, index) => sparkPoint(value, index, step, span, height)).filter((point) => point !== '').join(' ')
}

/**
 * JSON estável para copiar ou salvar neste PC. Não leva token nem URL.
 * Exemplo: `serializeProbeDump({ lidoEm: '00:00:00', faixas: [], captura: null, cadeia: null, volumes: null, contexto: null, historico: {}, eventos: [] })`.
 */
export function serializeProbeDump(dump: ProbeDump): string {
  return JSON.stringify(dump, null, 2)
}

function transportEvent(before: string | undefined, person: { name: string; transport: string }, atMs: number): ProbeEvent[] {
  if (before === undefined || before === person.transport) return []
  return [eventOf(atMs, 'transporte', `${person.name}: ${before} → ${person.transport}`)]
}

function eventOf(atMs: number, kind: ProbeEventKind, detail: string): ProbeEvent {
  return { atMs, kind, detail }
}

function sparkPoint(value: number | null, index: number, step: number, span: number, height: number): string {
  if (value === null || !Number.isFinite(value)) return ''
  const x = Math.round(index * step)
  const y = Math.round(height - (value / span) * height)
  return `${x},${y}`
}

function padClock(value: number): string {
  return String(value).padStart(2, '0')
}

export interface TraceInput {
  nowMs: number
  history: ProbeHistory
  events: readonly ProbeEvent[]
  seen: readonly string[] | null
  transports: Readonly<Record<string, string>>
  names: Readonly<Record<string, string>>
  device: string | null
  nextDevice: string | null
  rows: ReadonlyArray<{ key: string; name: string; transport: string; point: ProbePoint | null }>
}

export interface TraceResult {
  history: ProbeHistory
  events: ProbeEvent[]
  seen: string[]
  transports: Record<string, string>
  names: Record<string, string>
  device: string | null
}

/**
 * Empurra o gráfico de 60 s e anota quem entrou, saiu ou mudou de caminho.
 * Exemplo: `advanceProbeTrace({ nowMs: 0, history: {}, events: [], seen: null, transports: {}, names: {}, device: null, nextDevice: null, rows: [] })`.
 */
export function advanceProbeTrace(input: TraceInput): TraceResult {
  const history = historyOf(input)
  const seen = input.rows.map((row) => row.key)
  const names = namesOf(input.rows)
  const transports = transportsOf(input.rows)
  return {
    history,
    seen,
    names,
    transports,
    device: input.nextDevice,
    events: appendProbeEvents(input.events, changesOf(input)),
  }
}

function historyOf(input: TraceInput): ProbeHistory {
  const withPoints = input.rows.reduce(pushRow, input.history)
  return trimProbeHistory(withPoints, input.rows.map((row) => row.key))
}

function pushRow(history: ProbeHistory, row: TraceInput['rows'][number]): ProbeHistory {
  if (!row.point) return history
  return pushProbePoint(history, row.key, row.point)
}

function namesOf(rows: TraceInput['rows']): Record<string, string> {
  const names: Record<string, string> = {}
  for (const row of rows) names[row.key] = row.name
  return names
}

function transportsOf(rows: TraceInput['rows']): Record<string, string> {
  const transports: Record<string, string> = {}
  for (const row of rows) transports[row.key] = row.transport
  return transports
}

function changesOf(input: TraceInput): ProbeEvent[] {
  const current = input.rows.map((row) => ({ key: row.key, name: row.name }))
  const moved = input.rows.map((row) => ({ key: row.key, name: row.name, transport: row.transport }))
  const device = deviceEvent(input.device, input.nextDevice, input.nowMs)
  return [
    ...membershipEvents(input.seen, current, input.nowMs, input.names),
    ...transportEvents(input.transports, moved, input.nowMs),
    ...(device ? [device] : []),
  ]
}
