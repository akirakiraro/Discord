import { beforeEach, describe, expect, it } from 'vitest'
import { OWN_SCREEN_LISTEN, REMOTE_SCREEN_LISTEN } from '../lib/voice/screenAudioVolume'
import { isMicrophoneLive, useVoiceStore } from './voiceStore'

const CONNECTION = { channelId: 'v', token: 't', livekitUrl: 'ws://26.186.21.58:7880' }

describe('voiceStore', () => {
  beforeEach(() => {
    useVoiceStore.setState({
      connection: null,
      micMuted: false,
      deafened: false,
      micMutedBeforeDeafen: false,
      showOwnShare: true,
      showOwnTile: true,
      ownScreenAudioVolume: OWN_SCREEN_LISTEN,
      screenAudioVolume: REMOTE_SCREEN_LISTEN,
      lastError: null,
    })
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

  it('a própria tela começa muda e a dos outros no máximo', () => {
    expect(useVoiceStore.getState()).toMatchObject({
      ownScreenAudioVolume: OWN_SCREEN_LISTEN,
      screenAudioVolume: REMOTE_SCREEN_LISTEN,
    })
  })

  it('o volume da tela fica entre 0 e 1', () => {
    useVoiceStore.getState().setScreenAudioVolume(2)

    expect(useVoiceStore.getState().screenAudioVolume).toBe(1)

    useVoiceStore.getState().setScreenAudioVolume(-1)

    expect(useVoiceStore.getState().screenAudioVolume).toBe(0)
  })

  it('ensurdecer também muta o microfone', () => {
    useVoiceStore.getState().toggleDeafen()

    expect(useVoiceStore.getState()).toMatchObject({ micMuted: true, deafened: true })
  })

  it('mutar enquanto surdo desmuta o microfone e o áudio', () => {
    useVoiceStore.getState().toggleDeafen()
    useVoiceStore.getState().toggleMic()

    expect(useVoiceStore.getState()).toMatchObject({ micMuted: false, deafened: false, micMutedBeforeDeafen: false })
  })

  it('desensurdecer devolve o mute que estava antes', () => {
    useVoiceStore.getState().toggleMic()
    useVoiceStore.getState().toggleDeafen()
    useVoiceStore.getState().toggleDeafen()

    expect(useVoiceStore.getState()).toMatchObject({ micMuted: true, deafened: false, micMutedBeforeDeafen: false })
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
