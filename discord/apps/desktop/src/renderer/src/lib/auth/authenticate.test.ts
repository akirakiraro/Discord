import { describe, expect, it } from 'vitest'
import { FakeHostFetch, OfflineHostFetch } from '../testing/fakeHostFetch'
import { authenticate, restoreSession } from './authenticate'

const USER = { id: 'u-1', username: 'akira', displayName: 'akira', createdAt: 'x' }

describe('authenticate', () => {
  it('entra normalizando o usuário e devolve sessão autenticada', async () => {
    const host = new FakeHostFetch(() => Response.json({ token: 'tok', user: USER }))

    const session = await authenticate('26.186.21.58', ' Akira ', host.fetch)

    expect(host.calls[0]?.url).toBe('http://26.186.21.58:3000/auth/join')
    expect(JSON.parse(String(host.calls[0]?.init?.body))).toEqual({ username: 'akira' })
    expect(session).toMatchObject({ token: 'tok', user: USER })
    expect(session.api.baseUrl).toBe('http://26.186.21.58:3000')
  })

  it('valida no app antes de chamar o host, com o nome do campo', async () => {
    const host = new FakeHostFetch(() => Response.json({}))

    await expect(authenticate('26.186.21.58', 'ab', host.fetch)).rejects.toThrow(/^Usuário:/)
    expect(host.calls, 'nada deve ir para a rede').toHaveLength(0)
  })
})

describe('restoreSession', () => {
  it('reabre a sessão quando o token ainda vale', async () => {
    const host = new FakeHostFetch(() => Response.json(USER))

    expect(await restoreSession('26.186.21.58', 'tok', host.fetch)).toMatchObject({ token: 'tok', user: USER })
  })

  it('devolve null quando o host recusa o token', async () => {
    const host = new FakeHostFetch(() => Response.json({ error: 'unauthorized', message: 'x' }, { status: 401 }))

    expect(await restoreSession('26.186.21.58', 'velho', host.fetch)).toBeNull()
  })

  it('propaga falha de rede para o app mostrar o erro', async () => {
    await expect(restoreSession('26.186.21.58', 'tok', new OfflineHostFetch().fetch)).rejects.toThrow(/Radmin/)
  })
})
