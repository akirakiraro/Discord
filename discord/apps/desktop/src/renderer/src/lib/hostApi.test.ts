import { describe, expect, it } from 'vitest'
import { measureHostPingMs, requestVoiceToken } from './hostApi'
import { FakeHostFetch, OfflineHostFetch } from './testing/fakeHostFetch'

class SteppingClock {
  private readonly readings: number[]

  constructor(...readings: number[]) {
    this.readings = readings
  }

  readonly now = (): number => this.readings.shift() ?? 0
}

const BASE_URL = 'http://26.186.21.58:3000'

describe('requestVoiceToken', () => {
  it('faz POST com o pedido e devolve token e URL do LiveKit', async () => {
    const body = { token: 'abc', livekitUrl: 'ws://26.186.21.58:7880' }
    const host = new FakeHostFetch(() => Response.json(body))

    const result = await requestVoiceToken(BASE_URL, { displayName: 'Akira', roomName: 'geral' }, host.fetch)

    expect(result).toEqual(body)
    expect(host.calls[0]?.url).toBe(`${BASE_URL}/voice/token`)
    expect(host.calls[0]?.init?.method).toBe('POST')
    expect(host.calls[0]?.init?.body).toBe(JSON.stringify({ displayName: 'Akira', roomName: 'geral' }))
  })

  it('inclui status e corpo na mensagem quando o host recusa', async () => {
    const host = new FakeHostFetch(() => new Response('invalid_request', { status: 400 }))

    const pending = requestVoiceToken(BASE_URL, { displayName: '', roomName: 'geral' }, host.fetch)

    await expect(pending).rejects.toThrow(/400.*invalid_request/)
  })

  it('explica que o host está fora do ar quando a conexão falha', async () => {
    const pending = requestVoiceToken(BASE_URL, { displayName: 'Akira', roomName: 'geral' }, new OfflineHostFetch().fetch)

    await expect(pending).rejects.toThrow(/26\.186\.21\.58:3000.*Radmin/)
  })
})

describe('measureHostPingMs', () => {
  it('devolve o tempo entre o início e o fim do /health', async () => {
    const host = new FakeHostFetch(() => Response.json({ status: 'ok' }))
    const clock = new SteppingClock(100, 142.4)

    const ping = await measureHostPingMs(BASE_URL, host.fetch, clock.now)

    expect(ping, 'ping arredondado em ms').toBe(42)
    expect(host.calls[0]?.url).toBe(`${BASE_URL}/health`)
  })
})
