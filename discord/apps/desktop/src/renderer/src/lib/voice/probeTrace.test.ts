import { describe, expect, it } from 'vitest'
import {
  PROBE_HISTORY_LIMIT,
  advanceProbeTrace,
  deviceEvent,
  formatProbeClock,
  membershipEvents,
  pushProbePoint,
  serializeProbeDump,
  sparklinePoints,
  transportEvents,
  type ProbeHistory,
  type ProbePoint,
} from './probeTrace'

describe('rastro do debug de áudio', () => {
  it('guarda 60 s e descarta o ponto mais antigo', () => {
    let history: ProbeHistory = {}
    for (let index = 0; index <= PROBE_HISTORY_LIMIT; index += 1) history = pushProbePoint(history, 'bia', point(index))

    const series = history.bia ?? []
    expect(series).toHaveLength(PROBE_HISTORY_LIMIT)
    expect(series[0]?.atMs).toBe(1)
    expect(series.at(-1)?.atMs).toBe(PROBE_HISTORY_LIMIT)
  })

  it('não anuncia entrada na primeira leitura e anota saída, transporte e microfone', () => {
    expect(membershipEvents(null, [{ key: 'a', name: 'Bia' }], 0)).toEqual([])
    expect(membershipEvents(['a'], [{ key: 'b', name: 'Bia' }], 5, { a: 'Akira' })).toEqual([
      { atMs: 5, kind: 'entrou', detail: 'Bia' },
      { atMs: 5, kind: 'saiu', detail: 'Akira' },
    ])
    expect(transportEvents({ bia: 'UDP · direto' }, [{ key: 'bia', name: 'Bia', transport: 'TCP · relay' }], 8)).toEqual([
      { atMs: 8, kind: 'transporte', detail: 'Bia: UDP · direto → TCP · relay' },
    ])
    expect(deviceEvent('Mic A', 'Mic A', 0)).toBeNull()
    expect(deviceEvent(null, 'Mic A', 0)).toBeNull()
    expect(deviceEvent('Mic A', 'Mic B', 9)?.detail).toBe('Mic A → Mic B')
  })

  it('a primeira passada do painel não finge eventos e a seguinte anota quem saiu', () => {
    const first = advanceProbeTrace(trace([], null))
    expect(first.events).toEqual([])
    expect(first.seen).toEqual(['bia'])

    const second = advanceProbeTrace({ ...trace([], first.seen), history: first.history, transports: first.transports, names: first.names, rows: [] })
    expect(second.events).toEqual([{ atMs: 1_000, kind: 'saiu', detail: 'Bia' }])
    expect(second.history).toEqual({})
  })

  it('desenha a polilinha e formata o relógio local', () => {
    expect(sparklinePoints([0, 1], 10, 10)).toBe('0,10 10,0')
    expect(sparklinePoints([null, 4], 10, 10)).toBe('10,0')

    const at = new Date(2026, 0, 2, 3, 4, 5).getTime()
    expect(formatProbeClock(at)).toBe('03:04:05')
  })

  it('serializa o JSON sem token e com histórico e eventos', () => {
    const json = serializeProbeDump({
      lidoEm: '03:04:05',
      faixas: [],
      captura: null,
      cadeia: null,
      volumes: null,
      contexto: null,
      historico: { bia: [point(1)] },
      eventos: [{ atMs: 1, kind: 'entrou', detail: 'Bia' }],
    })
    const parsed = JSON.parse(json) as { historico: ProbeHistory; eventos: Array<{ kind: string }> }

    expect(parsed.historico.bia).toHaveLength(1)
    expect(parsed.eventos[0]?.kind).toBe('entrou')
    expect(json).not.toContain('token')
    expect(json).not.toContain('http')
  })
})

function point(atMs: number): ProbePoint {
  return { atMs, loss: 0, jitterMs: 1, bitrate: 128_000 }
}

function trace(events: [], seen: string[] | null): Parameters<typeof advanceProbeTrace>[0] {
  return {
    nowMs: 1_000,
    history: {},
    events,
    seen,
    transports: {},
    names: { bia: 'Bia' },
    device: null,
    nextDevice: null,
    rows: [{ key: 'bia', name: 'Bia', transport: 'UDP · direto', point: point(1_000) }],
  }
}
