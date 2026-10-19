import { describe, expect, it } from 'vitest'
import { FakeHostFetch, OfflineHostFetch } from '../testing/fakeHostFetch'
import { authenticate, restoreSession, type AuthForm } from './authenticate'

const USER = { id: 'u-1', username: 'akira', displayName: 'Akira', createdAt: 'x' }
const FORM: AuthForm = { hostAddress: '26.186.21.58', username: ' Akira ', displayName: 'Akira', password: 'segredo' }

describe('authenticate', () => {
  it('faz login normalizando o usuário e devolve sessão autenticada', async () => {
    const host = new FakeHostFetch(() => Response.json({ token: 'tok', user: USER }))

    const session = await authenticate(FORM, 'login', host.fetch)

    expect(host.calls[0]?.url).toBe('http://26.186.21.58:3000/auth/login')
    expect(JSON.parse(String(host.calls[0]?.init?.body))).toEqual({ username: 'akira', password: 'segredo' })
    expect(session).toMatchObject({ token: 'tok', user: USER })
    expect(session.api.baseUrl).toBe('http://26.186.21.58:3000')
  })

  it('cadastro envia o nome de exibição', async () => {
    const host = new FakeHostFetch(() => Response.json({ token: 'tok', user: USER }, { status: 201 }))

    await authenticate(FORM, 'register', host.fetch)

    expect(host.calls[0]?.url).toMatch(/\/auth\/register$/)
    expect(JSON.parse(String(host.calls[0]?.init?.body))).toMatchObject({ displayName: 'Akira' })
  })

  it('valida no app antes de chamar o host, com o nome do campo', async () => {
    const host = new FakeHostFetch(() => Response.json({}))

    await expect(authenticate({ ...FORM, password: '123' }, 'register', host.fetch)).rejects.toThrow(/^Senha:/)
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
