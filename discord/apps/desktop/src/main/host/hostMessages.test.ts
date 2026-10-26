import { describe, expect, it } from 'vitest'
import { explainHostExit, hostNodeVersionOk } from './hostMessages'

const BASE = 'O API encerrou com código 1 antes do host ficar pronto.'
const WINDOWS =
  'No Windows o Node leu o caminho do carregador como protocolo "c:". O --import precisa ser uma URL file:///C:/.... O manifesto continua com o caminho normal do arquivo.'

describe('frase quando o processo sai antes do host ficar pronto', () => {
  it('traduz o protocolo c: e cola a linha Error, sem culpar o Node 24', () => {
    const error = "Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Received protocol 'c:'"
    const log = ['ligando API em 26.186.21.58', error, 'Node.js v24.15.0'].join('\n')

    expect(explainHostExit('API', 1, log)).toBe(`${BASE} ${WINDOWS} ${error}`)
    expect(hostNodeVersionOk('v24.15.0')).toBe(true)
    expect(hostNodeVersionOk('v22.23.0')).toBe(true)
    expect(hostNodeVersionOk('v22.23.4')).toBe(true)
  })

  it('traduz porta ocupada, módulo faltando e Node anterior a 22.23', () => {
    const busy = 'Error: listen EADDRINUSE: address already in use 0.0.0.0:3000'
    const missing = "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'fastify'"

    expect(explainHostExit('API', 1, busy)).toBe(
      `${BASE} A porta já está em uso. Feche o host aberto no terminal, ou o programa que está nessa porta, e tente de novo. ${busy}`,
    )
    expect(explainHostExit('API', 1, missing)).toBe(
      `${BASE} Falta um módulo do Node. Na pasta do repositório, rode npm install. ${missing}`,
    )
    expect(explainHostExit('API', 1, 'Node.js v20.11.1')).toBe(
      `${BASE} Este Node é antigo demais para o host. Use 22.23 ou mais novo. O Node 24 também serve. Node.js v20.11.1`,
    )
    expect(hostNodeVersionOk('v22.12.0')).toBe(false)
    expect(hostNodeVersionOk('v22.22.9')).toBe(false)
  })

  it('sem linha de erro devolve só o código, e com Error genérico cola a linha', () => {
    expect(explainHostExit('LiveKit', 1, 'ligando LiveKit em 26.186.21.58\n')).toBe(
      'O LiveKit encerrou com código 1 antes do host ficar pronto.',
    )
    expect(explainHostExit('API', 1, 'Error: something broke\n    at main')).toBe(`${BASE} Error: something broke`)
    expect(explainHostExit('API', 1, ['a', 'b', 'c', 'd', 'e', 'f', 'g'].join('\n'))).toBe(`${BASE} b · c · d · e · f · g`)
  })
})
