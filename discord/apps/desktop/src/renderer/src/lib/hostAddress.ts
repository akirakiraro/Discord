import { SERVER_DEFAULT_PORT } from '@radcord/shared'

const HOSTNAME_PATTERN = /^[a-z0-9.-]+$/i

/**
 * Converte o que o usuário digitou ("26.186.21.58" ou "26.186.21.58:3000") na URL base da API do host.
 * Exemplo: `buildHostBaseUrl('26.186.21.58')` → `'http://26.186.21.58:3000'`
 */
export function buildHostBaseUrl(hostInput: string): string {
  const [hostname = '', portText, ...extra] = hostInput.trim().split(':')
  if (!HOSTNAME_PATTERN.test(hostname) || extra.length > 0) {
    throw new Error(`Endereço do host inválido: "${hostInput}". Esperado IP do Radmin, ex.: 26.186.21.58:3000`)
  }
  return `http://${hostname}:${parseHostPort(portText)}`
}

function parseHostPort(portText: string | undefined): number {
  if (portText === undefined || portText === '') return SERVER_DEFAULT_PORT
  const port = Number(portText)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Porta inválida: "${portText}". Esperado inteiro entre 1 e 65535`)
  }
  return port
}
