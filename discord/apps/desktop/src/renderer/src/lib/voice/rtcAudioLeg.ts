/** Um item do `RTCStatsReport`, só com os campos que o painel lê. */
export interface RtcStat {
  id: string
  type: string
  kind?: string
  mediaType?: string
  mimeType?: string
  clockRate?: number
  channels?: number
  packetsReceived?: number
  packetsSent?: number
  packetsLost?: number
  bytesReceived?: number
  bytesSent?: number
  jitter?: number
  roundTripTime?: number
  currentRoundTripTime?: number
  codecId?: string
  selectedCandidatePairId?: string
  localCandidateId?: string
  remoteCandidateId?: string
  nominated?: boolean
  state?: string
  protocol?: string
  candidateType?: string
  relayProtocol?: string
  remoteId?: string
  iceState?: string
  dtlsState?: string
  jitterBufferDelay?: number
  jitterBufferEmittedCount?: number
  concealedSamples?: number
  concealmentEvents?: number
  insertedSamplesForDeceleration?: number
  removedSamplesForAcceleration?: number
  nackCount?: number
  fecPacketsReceived?: number
  fecPacketsDiscarded?: number
  retransmittedPacketsSent?: number
  retransmittedPacketsReceived?: number
  audioLevel?: number
  totalAudioEnergy?: number
}

export interface CandidateEnd {
  protocol: 'udp' | 'tcp' | null
  kind: string | null
}

export interface AudioLegNumbers {
  lost: number
  packets: number
  jitterSec: number | null
  bytes: number
  codec: string | null
  clockHz: number | null
  channels: number | null
  rttSec: number | null
  protocol: 'udp' | 'tcp' | null
  path: string | null
  packetsReceived: number | null
  packetsSent: number | null
  jitterBufferDelay: number | null
  jitterBufferEmittedCount: number | null
  concealedSamples: number | null
  concealmentEvents: number | null
  insertedSamples: number | null
  removedSamples: number | null
  nackCount: number | null
  fecPacketsReceived: number | null
  fecPacketsDiscarded: number | null
  retransmittedPackets: number | null
  audioLevel: number | null
  totalAudioEnergy: number | null
  localEnd: CandidateEnd | null
  remoteEnd: CandidateEnd | null
  iceState: string | null
  dtlsState: string | null
}

interface CodecFacts {
  name: string | null
  clockHz: number | null
  channels: number | null
}

interface IcePath {
  protocol: 'udp' | 'tcp' | null
  kind: string | null
  rttSec: number | null
  localEnd: CandidateEnd | null
  remoteEnd: CandidateEnd | null
  iceState: string | null
  dtlsState: string | null
}

const COPY_KEYS = [
  'kind', 'mediaType', 'mimeType', 'clockRate', 'channels',
  'packetsReceived', 'packetsSent', 'packetsLost', 'bytesReceived', 'bytesSent',
  'jitter', 'roundTripTime', 'currentRoundTripTime', 'codecId', 'selectedCandidatePairId',
  'localCandidateId', 'remoteCandidateId', 'nominated', 'state', 'protocol',
  'candidateType', 'relayProtocol', 'remoteId', 'iceState', 'dtlsState',
  'jitterBufferDelay', 'jitterBufferEmittedCount', 'concealedSamples', 'concealmentEvents',
  'insertedSamplesForDeceleration', 'removedSamplesForAcceleration', 'nackCount',
  'fecPacketsReceived', 'fecPacketsDiscarded', 'retransmittedPacketsSent',
  'retransmittedPacketsReceived', 'audioLevel', 'totalAudioEnergy',
] as const

/**
 * Copia o relatório do WebRTC para objetos simples, que o teste também monta.
 * Exemplo: `flattenStats(await track.getRTCStatsReport())`.
 */
export function flattenStats(report: { forEach(fn: (stat: object, id: string) => void): void } | undefined): RtcStat[] {
  if (!report) return []
  const rows: RtcStat[] = []
  report.forEach((stat, id) => rows.push(flattenStat(stat, id)))
  return rows
}

/**
 * Números de uma faixa de áudio, enviada ou recebida.
 * Exemplo: `readLegNumbers(stats)?.codec` devolve `'opus'`.
 */
export function readLegNumbers(stats: RtcStat[]): AudioLegNumbers | null {
  const outbound = findRtp(stats, 'outbound-rtp')
  if (outbound) return fromOutbound(stats, outbound)
  const inbound = findRtp(stats, 'inbound-rtp')
  if (!inbound) return null
  return fromInbound(stats, inbound)
}

/**
 * Atraso médio do jitter buffer. O WebRTC soma o atraso e conta as emissões.
 * Exemplo: `averageJitterBufferSec(0.4, 10)` devolve `0.04`.
 */
export function averageJitterBufferSec(delay: number | null, count: number | null): number | null {
  if (delay === null || count === null || count <= 0) return null
  if (!Number.isFinite(delay) || !Number.isFinite(count)) return null
  return delay / count
}

function flattenStat(stat: object, id: string): RtcStat {
  const source = stat as Record<string, unknown>
  const row: RtcStat = { id: text(source.id) || id, type: text(source.type) }
  for (const key of COPY_KEYS) copyField(row, source, key)
  return row
}

function copyField(row: RtcStat, source: Record<string, unknown>, key: (typeof COPY_KEYS)[number]): void {
  const value = source[key]
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    Object.assign(row, { [key]: value })
  }
}

function findRtp(stats: RtcStat[], type: string): RtcStat | undefined {
  return stats.find((stat) => stat.type === type && isAudio(stat))
}

function isAudio(stat: RtcStat): boolean {
  return stat.kind === 'audio' || stat.mediaType === 'audio'
}

function fromOutbound(stats: RtcStat[], outbound: RtcStat): AudioLegNumbers {
  const remote = remoteInbound(stats, outbound)
  const path = icePath(stats)
  return {
    ...legBase(codecOf(stats, outbound.codecId), path),
    ...rtpDetail(outbound),
    lost: firstNumber(remote?.packetsLost, outbound.packetsLost),
    packets: count(outbound.packetsSent),
    jitterSec: finite(remote?.jitter),
    bytes: count(outbound.bytesSent),
    rttSec: path.rttSec ?? finite(remote?.roundTripTime),
  }
}

function fromInbound(stats: RtcStat[], inbound: RtcStat): AudioLegNumbers {
  const path = icePath(stats)
  return {
    ...legBase(codecOf(stats, inbound.codecId), path),
    ...rtpDetail(inbound),
    lost: count(inbound.packetsLost),
    packets: count(inbound.packetsReceived),
    jitterSec: finite(inbound.jitter),
    bytes: count(inbound.bytesReceived),
    rttSec: path.rttSec,
  }
}

function legBase(codec: CodecFacts, path: IcePath): Omit<AudioLegNumbers, 'lost' | 'packets' | 'jitterSec' | 'bytes' | 'rttSec'> {
  return {
    codec: codec.name,
    clockHz: codec.clockHz,
    channels: codec.channels,
    protocol: path.protocol,
    path: path.kind,
    packetsReceived: null,
    packetsSent: null,
    jitterBufferDelay: null,
    jitterBufferEmittedCount: null,
    concealedSamples: null,
    concealmentEvents: null,
    insertedSamples: null,
    removedSamples: null,
    nackCount: null,
    fecPacketsReceived: null,
    fecPacketsDiscarded: null,
    retransmittedPackets: null,
    audioLevel: null,
    totalAudioEnergy: null,
    localEnd: path.localEnd,
    remoteEnd: path.remoteEnd,
    iceState: path.iceState,
    dtlsState: path.dtlsState,
  }
}

function rtpDetail(stat: RtcStat): Partial<AudioLegNumbers> {
  return {
    packetsReceived: finite(stat.packetsReceived),
    packetsSent: finite(stat.packetsSent),
    jitterBufferDelay: finite(stat.jitterBufferDelay),
    jitterBufferEmittedCount: finite(stat.jitterBufferEmittedCount),
    concealedSamples: finite(stat.concealedSamples),
    concealmentEvents: finite(stat.concealmentEvents),
    insertedSamples: finite(stat.insertedSamplesForDeceleration),
    removedSamples: finite(stat.removedSamplesForAcceleration),
    nackCount: finite(stat.nackCount),
    fecPacketsReceived: finite(stat.fecPacketsReceived),
    fecPacketsDiscarded: finite(stat.fecPacketsDiscarded),
    retransmittedPackets: finite(stat.retransmittedPacketsReceived) ?? finite(stat.retransmittedPacketsSent),
    audioLevel: finite(stat.audioLevel),
    totalAudioEnergy: finite(stat.totalAudioEnergy),
  }
}

function remoteInbound(stats: RtcStat[], outbound: RtcStat): RtcStat | undefined {
  if (outbound.remoteId) return stats.find((stat) => stat.id === outbound.remoteId)
  return stats.find((stat) => stat.type === 'remote-inbound-rtp')
}

function icePath(stats: RtcStat[]): IcePath {
  const pair = selectedPair(stats)
  const local = pair ? stats.find((stat) => stat.id === pair.localCandidateId) : undefined
  const remote = pair ? stats.find((stat) => stat.id === pair.remoteCandidateId) : undefined
  const transport = stats.find((stat) => stat.type === 'transport')
  return {
    protocol: protocolOf(local),
    kind: textOrNull(local?.candidateType),
    rttSec: finite(pair?.currentRoundTripTime),
    localEnd: candidateEnd(local),
    remoteEnd: candidateEnd(remote),
    iceState: textOrNull(transport?.iceState),
    dtlsState: textOrNull(transport?.dtlsState),
  }
}

function selectedPair(stats: RtcStat[]): RtcStat | undefined {
  const chosen = pairByTransport(stats)
  if (chosen) return chosen
  return stats.find((stat) => stat.type === 'candidate-pair' && stat.nominated)
    ?? stats.find((stat) => stat.type === 'candidate-pair' && stat.state === 'succeeded')
}

function pairByTransport(stats: RtcStat[]): RtcStat | undefined {
  const transport = stats.find((stat) => stat.type === 'transport' && stat.selectedCandidatePairId)
  if (!transport?.selectedCandidatePairId) return undefined
  return stats.find((stat) => stat.id === transport.selectedCandidatePairId)
}

function candidateEnd(stat: RtcStat | undefined): CandidateEnd | null {
  if (!stat) return null
  return { protocol: protocolOf(stat), kind: textOrNull(stat.candidateType) }
}

function protocolOf(local: RtcStat | undefined): 'udp' | 'tcp' | null {
  if (!local) return null
  if (local.candidateType === 'relay') return asProtocol(local.relayProtocol) ?? asProtocol(local.protocol)
  return asProtocol(local.protocol)
}

function codecOf(stats: RtcStat[], codecId: string | undefined): CodecFacts {
  const codec = codecId ? stats.find((stat) => stat.id === codecId) : undefined
  if (!codec) return { name: null, clockHz: null, channels: null }
  return { name: codecLabel(codec.mimeType), clockHz: finite(codec.clockRate), channels: finite(codec.channels) }
}

function codecLabel(mime: unknown): string | null {
  if (typeof mime !== 'string' || mime.length === 0) return null
  const slash = mime.lastIndexOf('/')
  return (slash >= 0 ? mime.slice(slash + 1) : mime).toLowerCase()
}

function asProtocol(value: unknown): 'udp' | 'tcp' | null {
  if (typeof value !== 'string') return null
  const text = value.toLowerCase()
  if (text === 'udp' || text === 'tcp') return text
  return null
}

function firstNumber(...values: Array<number | undefined>): number {
  for (const value of values) {
    if (typeof value === 'number') return count(value)
  }
  return 0
}

function count(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}
