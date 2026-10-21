import { beforeEach, describe, expect, it } from 'vitest'
import { isMicrophoneLive, useVoiceStore } from './voiceStore'

const CONNECTION = { channelId: 'v', token: 't', livekitUrl: 'ws://26.186.21.58:7880' }

describe('voiceStore', () => {
  beforeEach(() => {
    useVoiceStore.setState({ connection: null, micMuted: false, deafened: false, showOwnShare: true, showOwnTile: true, lastError: null })
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

  it('a prévia da própria transmissão começa ligada e o toggle desliga', () => {
    expect(useVoiceStore.getState().showOwnShare).toBe(true)

    useVoiceStore.getState().toggleOwnShare()

    expect(useVoiceStore.getState().showOwnShare).toBe(false)
  })

  it('o ícone da própria pessoa começa visível e o toggle esconde', () => {
    expect(useVoiceStore.getState().showOwnTile).toBe(true)

    useVoiceStore.getState().toggleOwnTile()

    expect(useVoiceStore.getState().showOwnTile).toBe(false)
  })

  it('ensurdecer também muta o microfone', () => {
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
