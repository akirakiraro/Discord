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
}

const COPY_KEYS = [
  'kind', 'mediaType', 'mimeType', 'clockRate', 'channels',
  'packetsReceived', 'packetsSent', 'packetsLost', 'bytesReceived', 'bytesSent',
  'jitter', 'roundTripTime', 'currentRoundTripTime', 'codecId', 'selectedCandidatePairId',
  'localCandidateId', 'remoteCandidateId', 'nominated', 'state', 'protocol',
  'candidateType', 'relayProtocol', 'remoteId',
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
  const codec = codecOf(stats, outbound.codecId)
  return legNumbers(codec, path, {
    lost: firstNumber(remote?.packetsLost, outbound.packetsLost),
    packets: count(outbound.packetsSent),
    jitterSec: finite(remote?.jitter),
    bytes: count(outbound.bytesSent),
    rttSec: path.rttSec ?? finite(remote?.roundTripTime),
  })
}

function fromInbound(stats: RtcStat[], inbound: RtcStat): AudioLegNumbers {
  const path = icePath(stats)
  const codec = codecOf(stats, inbound.codecId)
  return legNumbers(codec, path, {
    lost: count(inbound.packetsLost),
    packets: count(inbound.packetsReceived),
    jitterSec: finite(inbound.jitter),
    bytes: count(inbound.bytesReceived),
    rttSec: path.rttSec,
  })
}

interface LegCounts {
  lost: number
  packets: number
  jitterSec: number | null
  bytes: number
  rttSec: number | null
}

function legNumbers(codec: CodecFacts, path: IcePath, counts: LegCounts): AudioLegNumbers {
  return { ...counts, codec: codec.name, clockHz: codec.clockHz, channels: codec.channels, protocol: path.protocol, path: path.kind }
}

function remoteInbound(stats: RtcStat[], outbound: RtcStat): RtcStat | undefined {
  if (outbound.remoteId) return stats.find((stat) => stat.id === outbound.remoteId)
  return stats.find((stat) => stat.type === 'remote-inbound-rtp')
}

function icePath(stats: RtcStat[]): IcePath {
  const pair = selectedPair(stats)
  const local = pair ? stats.find((stat) => stat.id === pair.localCandidateId) : undefined
  return { protocol: protocolOf(local), kind: textOrNull(local?.candidateType), rttSec: finite(pair?.currentRoundTripTime) }
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
    const counted = count(value)
    if (typeof value === 'number') return counted
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
