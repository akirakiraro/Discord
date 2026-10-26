import type { AudioLegNumbers, RtcStat } from './rtcAudioLeg'
import { readLegNumbers } from './rtcAudioLeg'

const PROBE_USERNAME = 'akira'
const MISSING = '—'

/** Perda acima disto pinta de vermelho. 2% exato continua amarelo. */
export const LOSS_BAD_RATIO = 0.02
/** Perda acima disto, e até 2%, pinta de amarelo. */
export const LOSS_WARN_RATIO = 0.005
/** Jitter acima disto, em ms, pinta de vermelho. */
export const JITTER_BAD_MS = 30
/** Jitter acima disto, em ms, pinta de amarelo. */
export const JITTER_WARN_MS = 15
/** RTT acima disto, em ms, pinta de vermelho. */
export const RTT_BAD_MS = 150
/** RTT acima disto, em ms, pinta de amarelo. */
export const RTT_WARN_MS = 80
/** Abaixo disto a captura está em banda estreita, o som de telefone. */
export const NARROW_RATE_HZ = 24_000
/** O painel fechado não lê estatística. Aberto, este é o intervalo. */
export const PROBE_INTERVAL_MS = 1000

const EMPTY_MICS = 'Nenhuma faixa de microfone nesta call.'

export type ProbeTone = 'ok' | 'warn' | 'bad' | 'idle'
export type ProbeDirection = 'enviado' | 'recebido'

export interface ProbeCursor {
  atMs: number
  bytes: number
  lost: number
  packets: number
}

export type ProbeMemory = Record<string, ProbeCursor>

export interface ProbeMetric {
  label: string
  value: string
  tone: ProbeTone
}

export interface ProbeLegView {
  key: string
  title: string
  metrics: ProbeMetric[]
}

export interface CallAudioProbeView {
  legs: ProbeLegView[]
  capture: ProbeMetric[] | null
  empty: string | null
}

export interface ProbeLegInput {
  key: string
  name: string
  direction: ProbeDirection
  stats: RtcStat[]
}

export interface CaptureSettings {
  noiseSuppression: boolean | null
  echoCancellation: boolean | null
  autoGainControl: boolean | null
  voiceIsolation: boolean | null
  sampleRate: number | null
  channelCount: number | null
}

export interface ProbeBuildInput {
  legs: ProbeLegInput[]
  capture: CaptureSettings | null
  nowMs: number
  memory: ProbeMemory
}

export interface ProbeBuildResult {
  view: CallAudioProbeView
  memory: ProbeMemory
}

/**
 * O painel só existe para esta conta. O nome de exibição não entra.
 * Exemplo: `seesCallAudioProbe('Akira')` é `true`.
 */
export function seesCallAudioProbe(username: string | null | undefined): boolean {
  return (username ?? '').trim().toLowerCase() === PROBE_USERNAME
}

/**
 * Perda em porcentagem com uma casa. `null` ainda não tem amostra.
 * Exemplo: `formatLossRatio(0.021)` devolve `'2,1%'`.
 */
export function formatLossRatio(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return MISSING
  return `${formatFixed(Math.max(0, ratio) * 100, 1)}%`
}

/** Exemplo: `formatMillis(0.012)` devolve `'12 ms'`. */
export function formatMillis(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return MISSING
  return `${Math.round(seconds * 1000)} ms`
}

/** Exemplo: `formatBitrate(128000)` devolve `'128 kbps'`. */
export function formatBitrate(bps: number | null): string {
  if (bps === null || !Number.isFinite(bps) || bps < 0) return MISSING
  const kbps = bps / 1000
  if (kbps >= 1000) return `${formatFixed(kbps / 1000, 1)} Mbps`
  return `${Math.round(kbps)} kbps`
}

/** Exemplo: `formatHertz(48000)` devolve `'48 kHz'`. */
export function formatHertz(hz: number | null): string {
  if (hz === null || !Number.isFinite(hz) || hz <= 0) return MISSING
  if (hz < 1000) return `${Math.round(hz)} Hz`
  const khz = hz / 1000
  const text = Number.isInteger(khz) ? String(khz) : formatFixed(khz, 1)
  return `${text} kHz`
}

/** Exemplo: `formatChannels(1)` devolve `'mono'`. */
export function formatChannels(count: number | null): string {
  if (count === null || !Number.isFinite(count)) return MISSING
  if (count === 1) return 'mono'
  if (count === 2) return 'estéreo'
  return String(Math.round(count))
}

/** Exemplo: `formatTransport('udp', 'host')` devolve `'UDP · direto'`. */
export function formatTransport(protocol: 'udp' | 'tcp' | null, path: string | null): string {
  const proto = protocol === 'udp' ? 'UDP' : protocol === 'tcp' ? 'TCP' : null
  const via = pathLabel(path)
  if (proto && via) return `${proto} · ${via}`
  return proto ?? via ?? MISSING
}

/** Exemplo: `lossTone(0.021)` devolve `'bad'`. */
export function lossTone(ratio: number | null): ProbeTone {
  if (ratio === null || !Number.isFinite(ratio)) return 'idle'
  if (ratio > LOSS_BAD_RATIO) return 'bad'
  if (ratio > LOSS_WARN_RATIO) return 'warn'
  return 'ok'
}

/** Exemplo: `jitterTone(0.04)` devolve `'bad'`. */
export function jitterTone(seconds: number | null): ProbeTone {
  return toneByMs(seconds, JITTER_WARN_MS, JITTER_BAD_MS)
}

/** Exemplo: `rttTone(0.2)` devolve `'bad'`. */
export function rttTone(seconds: number | null): ProbeTone {
  return toneByMs(seconds, RTT_WARN_MS, RTT_BAD_MS)
}

/** Exemplo: `transportTone('tcp', 'relay')` devolve `'bad'`. */
export function transportTone(protocol: 'udp' | 'tcp' | null, path: string | null): ProbeTone {
  if (protocol === 'tcp') return 'bad'
  if (path === 'relay') return 'warn'
  if (protocol === 'udp') return 'ok'
  return 'idle'
}

/** Exemplo: `codecTone('opus')` devolve `'ok'`. */
export function codecTone(name: string | null): ProbeTone {
  if (name === null) return 'idle'
  if (name === 'opus') return 'ok'
  return 'warn'
}

/**
 * Perda desde a amostra anterior. A primeira leitura usa o acumulado.
 * Exemplo: `lossSince(undefined, { atMs: 0, bytes: 0, lost: 2, packets: 98 })` é `0.02`.
 */
export function lossSince(previous: ProbeCursor | undefined, next: ProbeCursor): number | null {
  if (!previous) return packetRatio(next.lost, next.packets)
  const lost = next.lost - previous.lost
  const packets = next.packets - previous.packets
  if (lost < 0 || packets < 0) return packetRatio(next.lost, next.packets)
  return packetRatio(lost, packets)
}

/**
 * Bitrate real entre duas leituras. A primeira ainda não tem intervalo.
 * Exemplo: `bitrateSince(antes, { ...agora, bytes: antes.bytes + 16000, atMs: antes.atMs + 1000 })` é `128000`.
 */
export function bitrateSince(previous: ProbeCursor | undefined, next: ProbeCursor): number | null {
  if (!previous) return null
  const elapsed = next.atMs - previous.atMs
  if (elapsed <= 0) return null
  const delta = next.bytes - previous.bytes
  if (delta < 0) return null
  return (delta * 8 * 1000) / elapsed
}

/**
 * O que o `getSettings()` do Chromium devolveu na captura, não na faixa processada.
 * Exemplo: `captureFromSettings({ echoCancellation: false, sampleRate: 48000 })`.
 */
export function captureFromSettings(settings: object | null | undefined): CaptureSettings | null {
  if (!settings) return null
  const row = settings as Record<string, unknown>
  return {
    noiseSuppression: asBool(row.noiseSuppression),
    echoCancellation: asBool(row.echoCancellation),
    autoGainControl: asBool(row.autoGainControl),
    voiceIsolation: asBool(row.voiceIsolation),
    sampleRate: asFinite(row.sampleRate),
    channelCount: asFinite(row.channelCount),
  }
}

/**
 * Monta o texto do painel e guarda os contadores para o próximo segundo.
 * Exemplo: `buildCallAudioProbe({ legs, capture: null, nowMs, memory: {} })`.
 */
export function buildCallAudioProbe(input: ProbeBuildInput): ProbeBuildResult {
  const described = input.legs.map((leg) => describeLeg(leg, input.nowMs, input.memory))
  return {
    view: {
      legs: described.map((item) => item.view),
      capture: input.capture ? captureRows(input.capture) : null,
      empty: input.legs.length === 0 ? EMPTY_MICS : null,
    },
    memory: memoryFrom(input.legs, described),
  }
}

/** Exemplo: `probeFailureView('sem pc')` cabe no mesmo painel. */
export function probeFailureView(message: string): CallAudioProbeView {
  return { legs: [], capture: null, empty: `Não li as estatísticas: ${message}` }
}

function describeLeg(leg: ProbeLegInput, nowMs: number, memory: ProbeMemory): { view: ProbeLegView; cursor: ProbeCursor | null } {
  const numbers = readLegNumbers(leg.stats)
  if (!numbers) return { view: missingLeg(leg), cursor: null }
  const cursor = cursorOf(nowMs, numbers)
  return { view: filledLeg(leg, numbers, memory[leg.key], cursor), cursor }
}

function filledLeg(leg: ProbeLegInput, numbers: AudioLegNumbers, previous: ProbeCursor | undefined, cursor: ProbeCursor): ProbeLegView {
  return { key: leg.key, title: `${leg.name} · ${leg.direction}`, metrics: legMetrics(numbers, previous, cursor) }
}

function missingLeg(leg: ProbeLegInput): ProbeLegView {
  return {
    key: leg.key,
    title: `${leg.name} · ${leg.direction}`,
    metrics: [metric('Estado', 'sem estatística ainda', 'idle')],
  }
}

function legMetrics(numbers: AudioLegNumbers, previous: ProbeCursor | undefined, cursor: ProbeCursor): ProbeMetric[] {
  const loss = lossSince(previous, cursor)
  return [
    metric('Perda', formatLossRatio(loss), lossTone(loss)),
    metric('Jitter', formatMillis(numbers.jitterSec), jitterTone(numbers.jitterSec)),
    metric('Bitrate', formatBitrate(bitrateSince(previous, cursor)), 'idle'),
    metric('Codec', numbers.codec ?? MISSING, codecTone(numbers.codec)),
    metric('Taxa', formatHertz(numbers.clockHz), 'idle'),
    metric('Canais', formatChannels(numbers.channels), 'idle'),
    metric('RTT', formatMillis(numbers.rttSec), rttTone(numbers.rttSec)),
    metric('Transporte', formatTransport(numbers.protocol, numbers.path), transportTone(numbers.protocol, numbers.path)),
  ]
}

function cursorOf(nowMs: number, numbers: AudioLegNumbers): ProbeCursor {
  return { atMs: nowMs, bytes: numbers.bytes, lost: numbers.lost, packets: numbers.packets }
}

function memoryFrom(legs: ProbeLegInput[], described: Array<{ cursor: ProbeCursor | null }>): ProbeMemory {
  const memory: ProbeMemory = {}
  described.forEach((item, index) => {
    const key = legs[index]?.key
    if (item.cursor && key) memory[key] = item.cursor
  })
  return memory
}

function captureRows(settings: CaptureSettings): ProbeMetric[] {
  return [
    flagMetric('Supressão de ruído', settings.noiseSuppression, 'bad'),
    flagMetric('Cancelamento de eco', settings.echoCancellation, 'warn'),
    flagMetric('Ganho automático', settings.autoGainControl, 'bad'),
    flagMetric('Isolamento de voz', settings.voiceIsolation, 'bad'),
    metric('Taxa da captura', formatHertz(settings.sampleRate), rateTone(settings.sampleRate)),
    metric('Canais da captura', formatChannels(settings.channelCount), 'idle'),
  ]
}

function flagMetric(label: string, value: boolean | null, whenOn: ProbeTone): ProbeMetric {
  if (value === null) return metric(label, MISSING, 'idle')
  if (value) return metric(label, 'ligado', whenOn)
  return metric(label, 'desligado', 'ok')
}

function rateTone(hz: number | null): ProbeTone {
  if (hz === null) return 'idle'
  if (hz < NARROW_RATE_HZ) return 'bad'
  return 'ok'
}

function toneByMs(seconds: number | null, warnMs: number, badMs: number): ProbeTone {
  if (seconds === null || !Number.isFinite(seconds)) return 'idle'
  const ms = seconds * 1000
  if (ms > badMs) return 'bad'
  if (ms > warnMs) return 'warn'
  return 'ok'
}

function packetRatio(lost: number, packets: number): number | null {
  if (!Number.isFinite(lost) || !Number.isFinite(packets) || lost < 0 || packets < 0) return null
  const total = lost + packets
  if (total <= 0) return 0
  return lost / total
}

function pathLabel(path: string | null): string | null {
  if (path === 'host') return 'direto'
  if (path === 'srflx' || path === 'prflx') return 'reflexivo'
  if (path === 'relay') return 'relay'
  return path
}

function metric(label: string, value: string, tone: ProbeTone): ProbeMetric {
  return { label, value, tone }
}

function formatFixed(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',')
}

function asBool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function asFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
