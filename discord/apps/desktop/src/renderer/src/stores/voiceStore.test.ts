import { beforeEach, describe, expect, it } from 'vitest'
import { isMicrophoneLive, useVoiceStore } from './voiceStore'

const CONNECTION = { channelId: 'v', token: 't', livekitUrl: 'ws://26.186.21.58:7880' }

describe('voiceStore', () => {
  beforeEach(() => {
    useVoiceStore.setState({ connection: null, micMuted: false, deafened: false, lastError: null })
  })

  it('entrar limpa o erro anterior e sair pode registrar o motivo', () => {
    useVoiceStore.getState().leave('caiu')
    useVoiceStore.getState().join(CONNECTION)

    expect(useVoiceStore.getState()).toMatchObject({ connection: CONNECTION, lastError: null })

    useVoiceStore.getState().leave('Você entrou por outro PC')
    expect(useVoiceStore.getState()).toMatchObject({ connection: null, lastError: 'Você entrou por outro PC' })
  })

  it('alterna mute e ensurdecer', () => {
    useVoiceStore.getState().toggleMic()
    useVoiceStore.getState().toggleDeafen()

    expect(useVoiceStore.getState()).toMatchObject({ micMuted: true, deafened: true })
  })
})

describe('isMicrophoneLive', () => {
  it.each([
    [false, false, true],
    [true, false, false],
    [false, true, false],
  ])('micMuted=%s deafened=%s → %s', (micMuted, deafened, expected) => {
    expect(isMicrophoneLive({ micMuted, deafened })).toBe(expected)
  })
})
