import { createServer } from 'node:net'
import { describe, expect, it } from 'vitest'
import { describePortConflict, parseHealthBody, tcpAccepts, type HostProbe } from './hostProbe'

const QUIET: HostProbe = { healthOk: false, apiOpen: false, livekitOpen: false, online: 0, inVoice: 0 }

describe('sonda do host', () => {
  it('lê online e inVoice só do /health ok', () => {
    expect(parseHealthBody({ status: 'ok', online: 2, inVoice: 1 })).toEqual({ online: 2, inVoice: 1 })
    expect(parseHealthBody({ status: 'ok', online: 1.5, inVoice: 0 })).toBeNull()
    expect(parseHealthBody({ status: 'down', online: 0, inVoice: 0 })).toBeNull()
    expect(parseHealthBody(null)).toBeNull()
  })

  it('diz qual porta impede a subida', () => {
    expect(describePortConflict({ ...QUIET, healthOk: true, apiOpen: true, livekitOpen: true })).toBeNull()
    expect(describePortConflict({ ...QUIET, healthOk: true, apiOpen: true })).toBe(
      'A API responde na porta 3000, mas a porta 7880 do LiveKit não aceita conexão.',
    )
    expect(describePortConflict({ ...QUIET, apiOpen: true, livekitOpen: true })).toBe(
      'A porta 7880 está aberta, mas o /health da API na porta 3000 não respondeu.',
    )
    expect(describePortConflict({ ...QUIET, livekitOpen: true })).toBe(
      'A porta 7880 já está em uso. Feche o host aberto no terminal, ou o programa que está nessa porta, e tente de novo.',
    )
    expect(describePortConflict({ ...QUIET, apiOpen: true })).toBe(
      'A porta 3000 já está em uso. Feche o host aberto no terminal, ou o programa que está nessa porta, e tente de novo.',
    )
    expect(describePortConflict(QUIET)).toBeNull()
  })

  it('a porta local que aceita conexão devolve true e a fechada devolve false', async () => {
    const server = createServer()
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0

    expect(await tcpAccepts('127.0.0.1', port, 500)).toBe(true)
    await new Promise<void>((resolve) => server.close(() => resolve()))
    expect(await tcpAccepts('127.0.0.1', port, 200)).toBe(false)
  })
})
