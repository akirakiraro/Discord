import { describe, expect, it } from 'vitest'
import { formatMessageTimestamp, formatShortTime } from './formatTimestamp'

// Datas montadas no fuso local para o teste não depender do fuso da máquina.
const NOW = new Date(2026, 9, 19, 15, 0)

describe('formatMessageTimestamp', () => {
  it('usa "Hoje às" para o mesmo dia', () => {
    expect(formatMessageTimestamp(new Date(2026, 9, 19, 14, 5).toISOString(), NOW)).toBe('Hoje às 14:05')
  })

  it('usa "Ontem às" para o dia anterior', () => {
    expect(formatMessageTimestamp(new Date(2026, 9, 18, 23, 59).toISOString(), NOW)).toBe('Ontem às 23:59')
  })

  it('usa a data completa para dias mais antigos', () => {
    expect(formatMessageTimestamp(new Date(2026, 9, 1, 8, 0).toISOString(), NOW)).toBe('01/10/2026 08:00')
  })
})

describe('formatShortTime', () => {
  it('mostra só hora e minuto', () => {
    expect(formatShortTime(new Date(2026, 9, 19, 9, 7).toISOString())).toBe('09:07')
  })
})
