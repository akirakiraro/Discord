import { describe, expect, it } from 'vitest'
import { CLOSED_GATE, clampGateDb, dbToPercent, GATE_HOLD_MS, rmsToDb, stepGate } from './micLevel'

describe('rmsToDb', () => {
  it('trata silêncio como o começo da barra', () => {
    expect(rmsToDb(0)).toBe(-80)
  })

  it('converte amplitude em decibéis', () => {
    expect(rmsToDb(0.1)).toBeCloseTo(-20, 0)
  })
})

describe('clampGateDb', () => {
  it('não deixa o portão passar de −10 dB', () => {
    expect(clampGateDb(-5)).toBe(-10)
  })

  it('valor inválido volta para −45 dB', () => {
    expect(clampGateDb(Number.NaN)).toBe(-45)
  })
})

describe('dbToPercent', () => {
  it('−40 dB fica na metade da barra', () => {
    expect(dbToPercent(-40)).toBe(50)
  })
})

describe('stepGate', () => {
  it('segura aberto por um instante abaixo do limite', () => {
    const open = stepGate(CLOSED_GATE, -20, -45, 32)
    expect(stepGate(open, -70, -45, 32).open).toBe(true)
  })

  it('fecha depois do silêncio combinado', () => {
    const holding = { open: true, quietMs: GATE_HOLD_MS - 10 }
    expect(stepGate(holding, -70, -45, 10)).toEqual(CLOSED_GATE)
  })
})
