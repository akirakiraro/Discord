import { describe, expect, it } from 'vitest'
import { FakeHostFetch, OfflineHostFetch } from '../testing/fakeHostFetch'
import { ApiRequestError } from '../api/apiClient'
import { authenticate, describeLoginFailure, restoreSession } from './authenticate'

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

  it('propaga falha de rede; quem abre o app decide calar', async () => {
    await expect(restoreSession('26.186.21.58', 'tok', new OfflineHostFetch().fetch)).rejects.toThrow(/Radmin/)
  })
})

describe('describeLoginFailure', () => {
  it('host fora do ar vira uma frase só, sem o erro cru do fetch', async () => {
    const failure = await authenticate('26.186.21.58', 'akira', new OfflineHostFetch().fetch).catch((error: unknown) => error)

    expect(describeLoginFailure(failure, ' 26.186.21.58 ')).toBe(
      'Não encontramos o host em 26.186.21.58. Confira se o host está ligado e se o Radmin VPN está conectado.',
    )
  })

  it('erro da API e da validação local passam com a frase deles; 500 vira frase curta', () => {
    expect(describeLoginFailure(new ApiRequestError(400, 'bad_request', 'Nome em uso'), 'x')).toBe('Nome em uso')
    expect(describeLoginFailure(new ApiRequestError(500, 'internal_error', 'Erro inesperado no host'), 'x')).toBe('O host respondeu com erro. Tente de novo em instantes.')
    expect(describeLoginFailure(new Error('Usuário: curto demais'), 'x')).toBe('Usuário: curto demais')
    expect(describeLoginFailure('???', 'x')).toBe('Não foi possível entrar agora. Tente de novo em instantes.')
  })
})
