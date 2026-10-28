import { describe, expect, it } from 'vitest'
import { devBotIdentity, devBotName, devBotTokenRequestSchema } from './devToolsContract'
import { isMonitorIdentity } from './voiceContract'

describe('contrato do bot de teste', () => {
  it('identidade sem dois-pontos, para tocar o som de entrar e sair', () => {
    expect(devBotIdentity(1)).toBe('dev-bot-1')
    expect(devBotIdentity(12)).not.toContain(':')
    expect(isMonitorIdentity(devBotIdentity(3))).toBe(false)
    expect(devBotName(2)).toBe('Bot de teste 2')
  })

  it('número fora de 1 a 99 é recusado', () => {
    expect(() => devBotIdentity(0)).toThrow(/botNumber 0 inválido/)
    expect(devBotTokenRequestSchema.safeParse({ channelId: crypto.randomUUID(), botNumber: 100 }).success).toBe(false)
    expect(devBotTokenRequestSchema.safeParse({ channelId: 'canal', botNumber: 1 }).success).toBe(false)
    expect(devBotTokenRequestSchema.safeParse({ channelId: crypto.randomUUID(), botNumber: 1 }).success).toBe(true)
  })
})
