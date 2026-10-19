import type { FetchFunction } from './api/apiClient'

export type ClockFunction = () => number

const PING_TIMEOUT_MS = 5000
const browserFetch: FetchFunction = (url, init) => fetch(url, init)

/**
 * Mede o tempo de ida e volta até a API do host, útil para ver se o Radmin está em "relay".
 * Exemplo: `const ms = await measureHostPingMs('http://26.186.21.58:3000')`
 */
export async function measureHostPingMs(
  baseUrl: string,
  fetchFn: FetchFunction = browserFetch,
  now: ClockFunction = () => performance.now(),
): Promise<number> {
  const url = `${baseUrl}/health`
  const startedAt = now()
  const response = await fetchFn(url, { cache: 'no-store', signal: AbortSignal.timeout(PING_TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`Host respondeu ${response.status} em ${url}; esperado 200`)
  }
  return Math.round(now() - startedAt)
}
