import { averageJitterBufferSec, type AudioLegNumbers, type CandidateEnd } from './rtcAudioLeg'

export interface ProbeToneMetric {
  label: string
  value: string
  tone: 'ok' | 'warn' | 'bad' | 'idle'
}

export interface RawCursor {
  concealed: number | null
  concealmentEvents: number | null
  nack: number | null
  fec: number | null
  retransmitted: number | null
  inserted: number | null
  removed: number | null
}

const MISSING = '—'

/**
 * Campos brutos do getStats, com cor só onde o intervalo recente importa.
 * Exemplo: `rawLegMetrics(numbers, undefined)`.
 */
export function rawLegMetrics(numbers: AudioLegNumbers, previous: RawCursor | undefined): ProbeToneMetric[] {
  return [
    countMetric('Pacotes recebidos', numbers.packetsReceived),
    countMetric('Pacotes enviados', numbers.packetsSent),
    countMetric('Pacotes perdidos', numbers.lost),
    metric('Bytes', countText(numbers.bytes), 'idle'),
    metric('Jitter buffer', bufferText(numbers), bufferTone(averageJitterBufferSec(numbers.jitterBufferDelay, numbers.jitterBufferEmittedCount))),
    deltaMetric('Amostras ocultadas', numbers.concealedSamples, previous?.concealed),
    deltaMetric('Eventos de ocultação', numbers.concealmentEvents, previous?.concealmentEvents),
    deltaMetric('Amostras inseridas', numbers.insertedSamples, previous?.inserted),
    deltaMetric('Amostras removidas', numbers.removedSamples, previous?.removed),
    deltaMetric('NACK', numbers.nackCount, previous?.nack),
    deltaMetric('FEC recebido', numbers.fecPacketsReceived, previous?.fec),
    countMetric('FEC descartado', numbers.fecPacketsDiscarded),
    deltaMetric('Retransmissões', numbers.retransmittedPackets, previous?.retransmitted),
    metric('Nível de áudio', levelText(numbers.audioLevel), 'idle'),
    metric('Energia de áudio', energyText(numbers.totalAudioEnergy), 'idle'),
    metric('ICE local', endText('local', numbers.localEnd), endTone(numbers.localEnd)),
    metric('ICE remoto', endText('remoto', numbers.remoteEnd), endTone(numbers.remoteEnd)),
    metric('ICE', numbers.iceState ?? MISSING, 'idle'),
    metric('DTLS', numbers.dtlsState ?? MISSING, 'idle'),
  ]
}

/** Exemplo: `rawCursorOf(numbers)` guarda os contadores para o Δ do próximo segundo. */
export function rawCursorOf(numbers: AudioLegNumbers): RawCursor {
  return {
    concealed: numbers.concealedSamples,
    concealmentEvents: numbers.concealmentEvents,
    nack: numbers.nackCount,
    fec: numbers.fecPacketsReceived,
    retransmitted: numbers.retransmittedPackets,
    inserted: numbers.insertedSamples,
    removed: numbers.removedSamples,
  }
}

/**
 * Variação desde a amostra anterior. A primeira leitura não inventa um Δ.
 * Exemplo: `counterDelta(10, 12)` devolve `2`.
 */
export function counterDelta(previous: number | null | undefined, next: number | null): number | null {
  if (next === null || previous === null || previous === undefined) return null
  if (!Number.isFinite(next) || !Number.isFinite(previous)) return null
  const delta = next - previous
  return delta < 0 ? null : delta
}

function deltaMetric(label: string, raw: number | null, previous: number | null | undefined): ProbeToneMetric {
  const delta = counterDelta(previous, raw)
  return metric(label, deltaText(raw, delta), burstTone(delta))
}

function countMetric(label: string, value: number | null): ProbeToneMetric {
  return metric(label, countText(value), 'idle')
}

function bufferText(numbers: AudioLegNumbers): string {
  const average = averageJitterBufferSec(numbers.jitterBufferDelay, numbers.jitterBufferEmittedCount)
  const sum = precise(numbers.jitterBufferDelay)
  const count = countText(numbers.jitterBufferEmittedCount)
  if (average === null) return sum
  return `${millis(average)} (soma ${sum}, n ${count})`
}

function bufferTone(seconds: number | null): ProbeToneMetric['tone'] {
  if (seconds === null) return 'idle'
  const ms = seconds * 1000
  if (ms > 150) return 'bad'
  if (ms > 80) return 'warn'
  return 'ok'
}

function burstTone(delta: number | null): ProbeToneMetric['tone'] {
  if (delta === null) return 'idle'
  if (delta > 10) return 'bad'
  if (delta > 0) return 'warn'
  return 'ok'
}

function endTone(end: CandidateEnd | null): ProbeToneMetric['tone'] {
  if (!end) return 'idle'
  if (end.protocol === 'tcp') return 'bad'
  if (end.kind === 'relay') return 'warn'
  if (end.protocol === 'udp') return 'ok'
  return 'idle'
}

function endText(side: string, end: CandidateEnd | null): string {
  if (!end) return `${side} —`
  const proto = end.protocol === 'udp' ? 'UDP' : end.protocol === 'tcp' ? 'TCP' : '—'
  return `${side} ${end.kind ?? '—'} ${proto}`
}

function deltaText(raw: number | null, delta: number | null): string {
  if (raw === null) return MISSING
  if (delta === null) return countText(raw)
  return `${countText(raw)} (Δ ${countText(delta)})`
}

function countText(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  return String(Math.round(value))
}

function precise(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(3).replace('.', ',')
}

function levelText(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  return value.toFixed(3).replace('.', ',')
}

function energyText(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return MISSING
  return value.toFixed(3).replace('.', ',')
}

function millis(seconds: number): string {
  return `${Math.round(seconds * 1000)} ms`
}

function metric(label: string, value: string, tone: ProbeToneMetric['tone']): ProbeToneMetric {
  return { label, value, tone }
}
