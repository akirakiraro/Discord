import { describe, expect, it } from 'vitest'
import {
  earCaptureFailure,
  earDetail,
  emptyEarInput,
  explainCaptureBlock,
  explainEarSilence,
  type EarElementState,
  type EarSilenceInput,
} from './earStatus'

const PLAYING: EarElementState = { paused: false, muted: false, volume: 1, readyState: 4 }

function ear(partial: Partial<EarSilenceInput>): EarSilenceInput {
  return { ...emptyEarInput(), ...partial }
}

describe('explainEarSilence', () => {
  it('explica eco e isolamento que apagam o retorno', () => {
    expect(explainCaptureBlock({ echoCancellation: true })).toMatch(/cancelamento de eco/)
    expect(explainCaptureBlock({ voiceIsolation: true })).toMatch(/isolamento de voz/)
    expect(explainCaptureBlock({})).toBeNull()
    expect(earCaptureFailure({ echoCancellation: true })?.detail).toContain('eco=1')
    expect(earCaptureFailure({})).toBeNull()
  })

  it('aponta sala vazia, microfone ausente e fonte inesperada', () => {
    expect(explainEarSilence(ear({ remoteCount: 0 }))).toMatch(/não viu ninguém/)
    expect(explainEarSilence(ear({ remoteCount: 1 }))).toMatch(/não encontrou esta conta/)
    expect(explainEarSilence(ear({ remoteCount: 1, ownSource: 'sem-microfone' }))).toMatch(/não estava publicado/)
    expect(explainEarSilence(ear({ remoteCount: 1, ownSource: 'camera' }))).toMatch(/camera/)
  })

  it('prioriza erro de assinatura, queda e playback', () => {
    expect(explainEarSilence(ear({ subscribeError: 'negado', remoteCount: 1 }))).toMatch(/negado/)
    expect(explainEarSilence(ear({ disconnectError: 'A escuta caiu: queda', sawOwnMic: true }))).toMatch(/caiu/)
    expect(explainEarSilence(ear({ playbackError: 'NotAllowedError', sawOwnMic: true }))).toMatch(/NotAllowedError/)
  })

  it('reclama de elemento mudo ou parado e aceita um que toca', () => {
    expect(explainEarSilence(ear({ sawOwnMic: true }))).toMatch(/elemento de áudio/)
    expect(explainEarSilence(ear({ sawOwnMic: true, element: { ...PLAYING, volume: 0 } }))).toMatch(/mudo/)
    expect(explainEarSilence(ear({ sawOwnMic: true, element: { ...PLAYING, paused: true } }))).toMatch(/não começou/)
    expect(explainEarSilence(ear({ sawOwnMic: true, element: PLAYING }))).toBeNull()
  })

  it('monta o relato curto com a URL e sem token', () => {
    const detail = earDetail(
      ear({ sawOwnMic: true, element: PLAYING, remoteCount: 2, ownSource: 'microphone' }),
      'ws://26.1.2.3:7880',
    )

    expect(detail).toContain('url=ws://26.1.2.3:7880')
    expect(detail).toContain('mic=1')
    expect(detail).not.toMatch(/eyJ/)
    expect(detail.length).toBeLessThanOrEqual(200)
  })
})
