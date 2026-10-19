import { describe, expect, it } from 'vitest'
import { openVoiceSession } from './voiceSession'
import { FakeHostFetch } from './testing/fakeHostFetch'

describe('openVoiceSession', () => {
  it('monta a sessão com URL do host, sala padrão e token recebido', async () => {
    const host = new FakeHostFetch(() => Response.json({ token: 'tok', livekitUrl: 'ws://26.186.21.58:7880' }))

    const session = await openVoiceSession({ hostAddress: '26.186.21.58', displayName: ' Akira ' }, undefined, host.fetch)

    expect(session).toEqual({
      hostBaseUrl: 'http://26.186.21.58:3000',
      roomName: 'geral',
      displayName: 'Akira',
      token: 'tok',
      livekitUrl: 'ws://26.186.21.58:7880',
    })
  })

  it('não chama o host quando o endereço é inválido', async () => {
    const host = new FakeHostFetch(() => Response.json({}))

    const pending = openVoiceSession({ hostAddress: 'endereço errado', displayName: 'Akira' }, 'geral', host.fetch)

    await expect(pending).rejects.toThrow(/"endereço errado"/)
    expect(host.calls, 'nenhuma chamada HTTP deve ser feita').toHaveLength(0)
  })
})
