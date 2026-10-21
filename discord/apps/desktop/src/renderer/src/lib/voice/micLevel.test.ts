import { describe, expect, it } from 'vitest'
import { micLevelPercent } from './micLevel'

describe('micLevelPercent', () => {
  it('silêncio fica no zero', () => {
    expect(micLevelPercent(0)).toBe(0)
  })

  it('voz no meio da escala enche metade da barra', () => {
    expect(micLevelPercent(0.1)).toBe(50)
  })

  it('não passa de 100', () => {
    expect(micLevelPercent(2)).toBe(100)
  })
})
