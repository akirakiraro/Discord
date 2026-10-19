import { describe, expect, it } from 'vitest'
import { DisconnectReason } from 'livekit-client'
import { describeVoiceDisconnect } from './describeVoiceDisconnect'

describe('describeVoiceDisconnect', () => {
  it('ignora saída feita pelo próprio usuário', () => {
    expect(describeVoiceDisconnect(DisconnectReason.CLIENT_INITIATED)).toBeNull()
  })

  it('explica quando entrou por outro dispositivo', () => {
    expect(describeVoiceDisconnect(DisconnectReason.DUPLICATE_IDENTITY)).toMatch(/outro dispositivo/)
  })

  it('usa mensagem genérica para motivo desconhecido ou ausente', () => {
    expect(describeVoiceDisconnect(undefined)).toBe('A conexão de voz caiu.')
    expect(describeVoiceDisconnect(DisconnectReason.UNKNOWN_REASON)).toBe('A conexão de voz caiu.')
  })
})
