import { describe, expect, it } from 'vitest'
import { counterDelta, rawLegMetrics } from './probeRaw'
import { averageJitterBufferSec, readLegNumbers, type AudioLegNumbers, type RtcStat } from './rtcAudioLeg'

describe('campos brutos do getStats', () => {
  it('mede o Δ e não inventa variação na primeira leitura', () => {
    expect(counterDelta(10, 12)).toBe(2)
    expect(counterDelta(undefined, 12)).toBeNull()
    expect(counterDelta(12, 10), 'contador que voltou não vira Δ negativo').toBeNull()
  })

  it('mostra jitter buffer, ocultação, NACK e as pontas ICE', () => {
    const rows = rawLegMetrics(leg(), { concealed: 18, concealmentEvents: 1, nack: 0, fec: 2, retransmitted: 5, inserted: 0, removed: 4 })
    expect(labeled(rows, 'Jitter buffer')).toMatchObject({ value: '160 ms (soma 1,600, n 10)', tone: 'bad' })
    expect(labeled(rows, 'Amostras ocultadas')).toMatchObject({ value: '20 (Δ 2)', tone: 'warn' })
    expect(labeled(rows, 'NACK')).toMatchObject({ value: '12 (Δ 12)', tone: 'bad' })
    expect(labeled(rows, 'FEC recebido')).toMatchObject({ value: '2 (Δ 0)', tone: 'ok' })
    expect(labeled(rows, 'ICE local').value).toBe('local host UDP')
    expect(labeled(rows, 'ICE remoto')).toMatchObject({ value: 'remoto relay TCP', tone: 'bad' })
    expect(labeled(rows, 'Nível de áudio').value).toBe('0,200')
  })

  it('a primeira leitura do NACK fica sem Δ e sem cor de rajada', () => {
    const row = rawLegMetrics(leg(), undefined).find((item) => item.label === 'NACK')
    expect(row).toEqual({ label: 'NACK', value: '12', tone: 'idle' })
  })

  it('copia jitter buffer, NACK e o par ICE do relatório', () => {
    const numbers = readLegNumbers(inboundRaw())
    expect(averageJitterBufferSec(numbers?.jitterBufferDelay ?? null, numbers?.jitterBufferEmittedCount ?? null)).toBeCloseTo(0.04)
    expect(numbers?.nackCount).toBe(2)
    expect(numbers?.localEnd).toEqual({ protocol: 'udp', kind: 'host' })
    expect(numbers?.remoteEnd).toEqual({ protocol: 'udp', kind: 'srflx' })
    expect(numbers?.iceState).toBe('connected')
    expect(numbers?.dtlsState).toBe('connected')
  })
})

function labeled(rows: Array<{ label: string; value: string; tone: string }>, label: string): { label: string; value: string; tone: string } {
  const found = rows.find((row) => row.label === label)
  if (!found) throw new Error(`métrica ${label} ausente; esperado um campo bruto do getStats`)
  return found
}

function leg(): AudioLegNumbers {
  return {
    lost: 1,
    packets: 100,
    jitterSec: 0.01,
    bytes: 1000,
    codec: 'opus',
    clockHz: 48_000,
    channels: 1,
    rttSec: 0.04,
    protocol: 'udp',
    path: 'host',
    packetsReceived: 100,
    packetsSent: null,
    jitterBufferDelay: 1.6,
    jitterBufferEmittedCount: 10,
    concealedSamples: 20,
    concealmentEvents: 3,
    insertedSamples: 0,
    removedSamples: 4,
    nackCount: 12,
    fecPacketsReceived: 2,
    fecPacketsDiscarded: 1,
    retransmittedPackets: 5,
    audioLevel: 0.2,
    totalAudioEnergy: 1.5,
    localEnd: { protocol: 'udp', kind: 'host' },
    remoteEnd: { protocol: 'tcp', kind: 'relay' },
    iceState: 'connected',
    dtlsState: 'connected',
  }
}

function inboundRaw(): RtcStat[] {
  return [
    { id: 'in', type: 'inbound-rtp', kind: 'audio', packetsReceived: 10, packetsLost: 0, bytesReceived: 100, jitterBufferDelay: 0.4, jitterBufferEmittedCount: 10, nackCount: 2, concealedSamples: 8, audioLevel: 0.1 },
    { id: 'transport', type: 'transport', selectedCandidatePairId: 'pair', iceState: 'connected', dtlsState: 'connected' },
    { id: 'pair', type: 'candidate-pair', currentRoundTripTime: 0.05, localCandidateId: 'local', remoteCandidateId: 'remote' },
    { id: 'local', type: 'local-candidate', protocol: 'udp', candidateType: 'host' },
    { id: 'remote', type: 'remote-candidate', protocol: 'udp', candidateType: 'srflx' },
  ]
}
