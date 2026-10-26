import { describe, expect, it } from 'vitest'
import { chainMetrics, formatBag, sourceMetrics, volumeMetrics, type MicChainReading } from './probeChain'

describe('cadeia e captura no debug', () => {
  it('mostra o slider em 100% e o portão fechado', () => {
    const rows = chainMetrics(reading())
    expect(rows?.find((row) => row.label === 'Ganho do slider')).toEqual({ label: 'Ganho do slider', value: '100%', tone: 'ok' })
    expect(rows?.find((row) => row.label === 'Nível do leveler')).toMatchObject({ value: '150%', tone: 'warn' })
    expect(rows?.find((row) => row.label === 'Portão')).toEqual({ label: 'Portão', value: 'fechado', tone: 'idle' })
    expect(chainMetrics(null)).toBeNull()
  })

  it('pinta o volume por pessoa e ordena as chaves do getSettings', () => {
    expect(volumeMetrics([{ name: 'Bia', percent: 100 }])[0]).toMatchObject({ value: '100%', tone: 'ok' })
    expect(volumeMetrics([{ name: 'Bia', percent: 0 }])[0]?.tone).toBe('bad')
    expect(volumeMetrics([{ name: 'Bia', percent: 150 }])[0]?.tone).toBe('warn')
    expect(formatBag({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
    expect(formatBag({})).toBe('{}')
    expect(formatBag(null)).toBe('—')
    expect(sourceMetrics({ settings: { b: 1, a: 2 }, constraints: {}, capabilities: null, device: 'Mic (id)' })[0]).toMatchObject({
      label: 'Dispositivo',
      value: 'Mic (id)',
    })
  })
})

function reading(): MicChainReading {
  return {
    sliderGain: 1,
    levelerGain: 1.5,
    limiterAttenuation: 0,
    gateOpen: false,
    levelDb: -20,
    thresholdDb: -45,
    autoGain: false,
    sampleRate: 48_000,
    baseLatencySec: 0.01,
    outputLatencySec: 0.02,
  }
}
