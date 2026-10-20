import { describe, expect, it } from 'vitest'
import { FakeHostFetch, OfflineHostFetch } from '../testing/fakeHostFetch'
import { ApiRequestError, RadcordApiClient } from './apiClient'

const BASE_URL = 'http://26.186.21.58:3000'

describe('RadcordApiClient', () => {
  it('envia corpo JSON e token nas rotas autenticadas', async () => {
    const host = new FakeHostFetch(() => Response.json({ id: 'm-1' }, { status: 201 }))
    const api = new RadcordApiClient(BASE_URL, 'tok', host.fetch)

    await api.sendMessage('c-1', 'oi')

    expect(host.calls[0]?.url).toBe(`${BASE_URL}/channels/c-1/messages`)
    expect(host.calls[0]?.init?.method).toBe('POST')
    expect(host.calls[0]?.init?.body).toBe('{"content":"oi"}')
    expect(host.lastHeaders()).toEqual({ 'content-type': 'application/json', authorization: 'Bearer tok' })
  })

  it('não manda content-type em requisição sem corpo', async () => {
    const host = new FakeHostFetch(() => new Response(null, { status: 204 }))

    await new RadcordApiClient(BASE_URL, 'tok', host.fetch).deleteMessage('m-1')

    expect(host.lastHeaders(), 'DELETE sem corpo').toEqual({ authorization: 'Bearer tok' })
  })

  it('monta o cursor de histórico na query string', async () => {
    const host = new FakeHostFetch(() => Response.json({ messages: [], hasMore: false }))

    await new RadcordApiClient(BASE_URL, 'tok', host.fetch).listMessages('c-1', 'm-9')

    expect(host.calls[0]?.url).toBe(`${BASE_URL}/channels/c-1/messages?before=m-9`)
  })

  it('withToken mantém o host e passa a autenticar', async () => {
    const host = new FakeHostFetch(() => Response.json([]))

    await new RadcordApiClient(BASE_URL, null, host.fetch).withToken('novo').listChannels()

    expect(host.lastHeaders().authorization).toBe('Bearer novo')
  })

  it('converte o erro do host em ApiRequestError com código e mensagem', async () => {
    const host = new FakeHostFetch(() => Response.json({ error: 'invalid_credentials', message: 'senha errada' }, { status: 401 }))

    const attempt = new RadcordApiClient(BASE_URL, null, host.fetch).join({ username: 'akira' })

    await expect(attempt).rejects.toBeInstanceOf(ApiRequestError)
    await expect(attempt).rejects.toMatchObject({ status: 401, code: 'invalid_credentials', message: 'senha errada' })
  })

  it('explica quando o host não responde', async () => {
    const attempt = new RadcordApiClient(BASE_URL, null, new OfflineHostFetch().fetch).me()

    await expect(attempt).rejects.toMatchObject({ code: 'host_unreachable' })
    await expect(attempt).rejects.toThrow(/26\.186\.21\.58:3000.*Radmin/)
  })
})
