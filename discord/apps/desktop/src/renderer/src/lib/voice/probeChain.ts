export interface MicChainReading {
  sliderGain: number
  levelerGain: number
  limiterAttenuation: number
  gateOpen: boolean
  levelDb: number
  thresholdDb: number
  autoGain: boolean
  sampleRate: number | null
  baseLatencySec: number | null
  outputLatencySec: number | null
}

export interface SourceBags {
  settings: object | null
  constraints: object | null
  capabilities: object | null
  device: string | null
}

const MISSING = '—'
const NARROW_RATE_HZ = 24_000

type ProbeTone = 'ok' | 'warn' | 'bad' | 'idle'

interface ProbeMetric {
  label: string
  value: string
  tone: ProbeTone
}

/**
 * Estado da cadeia publicada. 1 no slider é o microfone sem ganho nosso.
 * Exemplo: `chainMetrics({ sliderGain: 1, levelerGain: 1, limiterAttenuation: 0, gateOpen: true, levelDb: -20, thresholdDb: -45, autoGain: false, sampleRate: 48000, baseLatencySec: 0.01, outputLatencySec: 0.02 })`.
 */
export function chainMetrics(reading: MicChainReading | null): ProbeMetric[] | null {
  if (!reading) return null
  return [
    metric('Ganho do slider', gainText(reading.sliderGain), reading.sliderGain === 1 ? 'ok' : 'warn'),
    metric('Nível do leveler', gainText(reading.levelerGain), reading.levelerGain === 1 ? 'ok' : 'warn'),
    metric('Atenuação do limiter', ratioText(reading.limiterAttenuation), reading.limiterAttenuation > 0.05 ? 'warn' : 'ok'),
    metric('Portão', reading.gateOpen ? 'aberto' : 'fechado', reading.gateOpen ? 'ok' : 'idle'),
    metric('Nível antes do portão', `${Math.round(reading.levelDb)} dB`, 'idle'),
    metric('Limite do portão', `${Math.round(reading.thresholdDb)} dB`, 'idle'),
    metric('Nivelador', reading.autoGain ? 'ligado' : 'desligado', 'idle'),
  ]
}

/** Latência do AudioContext que processa o microfone. Exemplo: `contextMetrics(leitura)`. */
export function contextMetrics(reading: MicChainReading | null): ProbeMetric[] | null {
  if (!reading) return null
  return [
    metric('Taxa do contexto', formatHertz(reading.sampleRate), rateTone(reading.sampleRate)),
    metric('baseLatency', formatMillis(reading.baseLatencySec), 'idle'),
    metric('outputLatency', formatMillis(reading.outputLatencySec), latencyTone(reading.outputLatencySec)),
  ]
}

/**
 * Volume com que este aparelho ouve cada pessoa. 100% não altera a faixa.
 * Exemplo: `volumeMetrics([{ name: 'Bia', percent: 150 }])`.
 */
export function volumeMetrics(rows: ReadonlyArray<{ name: string; percent: number }>): ProbeMetric[] {
  return rows.map((row) => metric(`Volume de ${row.name}`, `${row.percent}%`, volumeTone(row.percent)))
}

/** JSON de getSettings, getConstraints e getCapabilities. Exemplo: `sourceMetrics(bags)`. */
export function sourceMetrics(bags: SourceBags | null): ProbeMetric[] {
  if (!bags) return []
  return [
    metric('Dispositivo', bags.device ?? MISSING, 'idle'),
    metric('getSettings', formatBag(bags.settings), 'idle'),
    metric('getConstraints', formatBag(bags.constraints), 'idle'),
    metric('getCapabilities', formatBag(bags.capabilities), 'idle'),
  ]
}

/**
 * Objeto com chaves ordenadas, para o JSON copiado não mudar de ordem à toa.
 * Exemplo: `formatBag({ b: 1, a: 2 })` devolve `'{"a":2,"b":1}'`.
 */
export function formatBag(value: object | null | undefined): string {
  if (!value) return MISSING
  const keys = Object.keys(value)
  if (keys.length === 0) return '{}'
  return JSON.stringify(sortedBag(value))
}

function volumeTone(percent: number): ProbeTone {
  if (percent === 0) return 'bad'
  if (percent === 100) return 'ok'
  return 'warn'
}

function rateTone(hz: number | null): ProbeTone {
  if (hz === null) return 'idle'
  if (hz < NARROW_RATE_HZ) return 'bad'
  return 'ok'
}

function latencyTone(seconds: number | null): ProbeTone {
  if (seconds === null) return 'idle'
  if (seconds > 0.08) return 'warn'
  return 'ok'
}

function formatHertz(hz: number | null): string {
  if (hz === null || !Number.isFinite(hz) || hz <= 0) return MISSING
  if (hz < 1000) return `${Math.round(hz)} Hz`
  const khz = hz / 1000
  const text = Number.isInteger(khz) ? String(khz) : khz.toFixed(1).replace('.', ',')
  return `${text} kHz`
}

function formatMillis(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return MISSING
  return `${Math.round(seconds * 1000)} ms`
}

function gainText(gain: number): string {
  if (!Number.isFinite(gain)) return MISSING
  return `${Math.round(gain * 100)}%`
}

function ratioText(ratio: number): string {
  if (!Number.isFinite(ratio)) return MISSING
  return `${(Math.max(0, ratio) * 100).toFixed(1).replace('.', ',')}%`
}

function sortedBag(value: object): Record<string, unknown> {
  const row = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(row).sort()) out[key] = row[key]
  return out
}

function metric(label: string, value: string, tone: ProbeTone): ProbeMetric {
  return { label, value, tone }
}
