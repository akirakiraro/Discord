import { Track } from 'livekit-client'
import { describe, expect, it } from 'vitest'
import {
  LOSS_BAD_RATIO,
  bitrateSince,
  codecTone,
  formatBitrate,
  formatChannels,
  formatHertz,
  formatLossRatio,
  formatMillis,
  formatTransport,
  jitterTone,
  lossSince,
  lossTone,
  rttTone,
  seesCallAudioProbe,
  transportTone,
  type ProbeCursor,
} from './callAudioProbe'
import { includeRemoteMic, probePeople, readProbeSnapshot, type ProbeParticipant, type ProbeRoom, type ProbeTrack } from './collectCallAudioProbe'
import { readLegNumbers, type RtcStat } from './rtcAudioLeg'

describe('quem vê o diagnóstico', () => {
  it('aceita só o usuário akira, sem diferenciar maiúsculas', () => {
    expect(seesCallAudioProbe('akira')).toBe(true)
    expect(seesCallAudioProbe('Akira')).toBe(true)
    expect(seesCallAudioProbe(' AKIRA ')).toBe(true)
    expect(seesCallAudioProbe('bia')).toBe(false)
    expect(seesCallAudioProbe('akira2')).toBe(false)
    expect(seesCallAudioProbe('')).toBe(false)
    expect(seesCallAudioProbe(null)).toBe(false)
    expect(seesCallAudioProbe(undefined)).toBe(false)
  })

  it('não lista a escuta invisível nem faixa que não é microfone', () => {
    expect(includeRemoteMic('u-bia')).toBe(true)
    expect(includeRemoteMic('u-1:monitor')).toBe(false)
    expect(includeRemoteMic('  ')).toBe(false)

    const room = probeRoom()
    const names = probePeople(room).map((person) => person.name)
    expect(names).toEqual(['Akira', 'Bia'])
  })
})

describe('formatação do diagnóstico', () => {
  it('escreve perda, tempo, bitrate, taxa e transporte em português', () => {
    expect(formatLossRatio(0.02)).toBe('2,0%')
    expect(formatLossRatio(0.021)).toBe('2,1%')
    expect(formatLossRatio(null)).toBe('—')
    expect(formatMillis(0.012)).toBe('12 ms')
    expect(formatMillis(0.2)).toBe('200 ms')
    expect(formatBitrate(128_000)).toBe('128 kbps')
    expect(formatBitrate(1_500_000)).toBe('1,5 Mbps')
    expect(formatBitrate(null)).toBe('—')
    expect(formatHertz(48_000)).toBe('48 kHz')
    expect(formatHertz(16_000)).toBe('16 kHz')
    expect(formatChannels(1)).toBe('mono')
    expect(formatChannels(2)).toBe('estéreo')
    expect(formatTransport('udp', 'host')).toBe('UDP · direto')
    expect(formatTransport('tcp', 'relay')).toBe('TCP · relay')
  })

  it('pinta perda acima de 2%, jitter alto, RTT alto e TCP', () => {
    expect(lossTone(LOSS_BAD_RATIO), '2% exato ainda é amarelo').toBe('warn')
    expect(lossTone(0.021)).toBe('bad')
    expect(lossTone(0.01)).toBe('warn')
    expect(lossTone(0)).toBe('ok')
    expect(jitterTone(0.015)).toBe('ok')
    expect(jitterTone(0.016)).toBe('warn')
    expect(jitterTone(0.031)).toBe('bad')
    expect(rttTone(0.08)).toBe('ok')
    expect(rttTone(0.081)).toBe('warn')
    expect(rttTone(0.151)).toBe('bad')
    expect(transportTone('udp', 'host')).toBe('ok')
    expect(transportTone('udp', 'relay')).toBe('warn')
    expect(transportTone('tcp', 'host')).toBe('bad')
    expect(codecTone('opus')).toBe('ok')
    expect(codecTone('pcmu')).toBe('warn')
  })

  it('mede o intervalo e, na primeira leitura, a perda acumulada', () => {
    const start: ProbeCursor = { atMs: 0, bytes: 0, lost: 2, packets: 98 }
    const next: ProbeCursor = { atMs: 1000, bytes: 16_000, lost: 4, packets: 196 }

    expect(lossSince(undefined, start)).toBeCloseTo(0.02)
    expect(lossSince(start, next)).toBeCloseTo(0.02)
    expect(bitrateSince(undefined, start)).toBeNull()
    expect(bitrateSince(start, next)).toBe(128_000)
  })
})

describe('estatística da faixa', () => {
  it('lê recebimento com TCP relay e envio com UDP direto', () => {
    const inbound = readLegNumbers(inboundStats())
    expect(inbound).toMatchObject({
      lost: 30,
      packets: 1000,
      jitterSec: 0.04,
      codec: 'opus',
      clockHz: 48_000,
      channels: 1,
      rttSec: 0.2,
      protocol: 'tcp',
      path: 'relay',
    })

    const outbound = readLegNumbers(outboundStats(16_000, 3, 200))
    expect(outbound).toMatchObject({ codec: 'opus', protocol: 'udp', path: 'host', lost: 3, packets: 200, jitterSec: 0.01 })
  })

  it('monta o painel com bitrate no segundo seguinte e o getSettings da captura', async () => {
    const first = await readProbeSnapshot([sender(0, 0, 100)], 1_000, {})
    const second = await readProbeSnapshot([sender(16_000, 30, 200)], 2_000, first.memory)
    const bitrate = metric(second.view.legs[0], 'Bitrate')
    const loss = metric(second.view.legs[0], 'Perda')

    expect(bitrate).toEqual({ label: 'Bitrate', value: '128 kbps', tone: 'idle' })
    expect(loss.tone, '30 perdidos em 100 enviados passa de 2%').toBe('bad')
    expect(loss.value).toBe('23,1%')
    expect(second.view.capture?.find((row) => row.label === 'Isolamento de voz')).toEqual({
      label: 'Isolamento de voz',
      value: 'ligado',
      tone: 'bad',
    })
    expect(second.view.capture?.find((row) => row.label === 'Taxa da captura')?.tone).toBe('bad')
    expect(second.view.capture?.find((row) => row.label === 'Cancelamento de eco')?.tone).toBe('warn')
    expect(second.view.capture?.find((row) => row.label === 'Supressão de ruído')).toMatchObject({ value: 'desligado', tone: 'ok' })
  })
})

function metric(leg: { metrics: Array<{ label: string; value: string; tone: string }> } | undefined, label: string): { label: string; value: string; tone: string } {
  const found = leg?.metrics.find((row) => row.label === label)
  if (!found) throw new Error(`métrica ${label} ausente no painel; esperado uma linha com esse rótulo`)
  return found
}

function sender(bytes: number, lost: number, sent: number): import('./collectCallAudioProbe').ProbePerson {
  return {
    key: 'enviado:me',
    name: 'Akira',
    direction: 'enviado',
    capture: true,
    track: track(outboundStats(bytes, lost, sent), {
      noiseSuppression: false,
      echoCancellation: true,
      autoGainControl: false,
      voiceIsolation: true,
      sampleRate: 16_000,
      channelCount: 1,
    }),
  }
}

function inboundStats(): RtcStat[] {
  return [
    { id: 'in', type: 'inbound-rtp', kind: 'audio', packetsReceived: 1000, packetsLost: 30, bytesReceived: 8000, jitter: 0.04, codecId: 'opus' },
    { id: 'opus', type: 'codec', mimeType: 'audio/opus', clockRate: 48_000, channels: 1 },
    { id: 'transport', type: 'transport', selectedCandidatePairId: 'pair' },
    { id: 'pair', type: 'candidate-pair', nominated: true, state: 'succeeded', currentRoundTripTime: 0.2, localCandidateId: 'local' },
    { id: 'local', type: 'local-candidate', protocol: 'udp', candidateType: 'relay', relayProtocol: 'tcp' },
  ]
}

function outboundStats(bytes: number, lost: number, sent: number): RtcStat[] {
  return [
    { id: 'out', type: 'outbound-rtp', kind: 'audio', bytesSent: bytes, packetsSent: sent, codecId: 'opus', remoteId: 'remote' },
    { id: 'remote', type: 'remote-inbound-rtp', packetsLost: lost, jitter: 0.01, roundTripTime: 0.04 },
    { id: 'opus', type: 'codec', mimeType: 'audio/opus', clockRate: 48_000, channels: 1 },
    { id: 'transport', type: 'transport', selectedCandidatePairId: 'pair' },
    { id: 'pair', type: 'candidate-pair', nominated: true, state: 'succeeded', currentRoundTripTime: 0.04, localCandidateId: 'local' },
    { id: 'local', type: 'local-candidate', protocol: 'udp', candidateType: 'host' },
  ]
}

function track(stats: RtcStat[], settings: object | null): ProbeTrack {
  return {
    kind: Track.Kind.Audio,
    sid: 'TR',
    getRTCStatsReport: async () => ({
      forEach(fn) {
        for (const stat of stats) fn(stat, stat.id)
      },
    }),
    getSourceTrackSettings: settings ? () => settings : undefined,
  }
}

function probeRoom(): ProbeRoom {
  return {
    localParticipant: participant('u-akira', 'Akira', track([], null)),
    remoteParticipants: {
      values: () => [
        participant('u-bia', 'Bia', track([], null)),
        participant('u-akira:monitor', 'Escuta', track([], null)),
        participant('u-tela', 'Tela', { ...track([], null), kind: Track.Kind.Video }),
      ],
    },
  }
}

function participant(identity: string, name: string, media: ProbeTrack | null): ProbeParticipant {
  return {
    identity,
    name,
    getTrackPublication: (source) => (source === Track.Source.Microphone && media ? { track: media } : undefined),
  }
}
