import type { VoiceTokenRequest, VoiceTokenResponse } from '@radcord/shared'

export type FetchFunction = (url: string, init?: RequestInit) => Promise<Response>
export type ClockFunction = () => number

const REQUEST_TIMEOUT_MS = 5000

/**
 * Pede ao host um token para entrar na sala de voz.
 * Exemplo: `await requestVoiceToken('http://26.186.21.58:3000', { displayName: 'Akira', roomName: 'geral' })`
 */
export async function requestVoiceToken(
  baseUrl: string,
  request: VoiceTokenRequest,
  fetchFn: FetchFunction = fetch,
): Promise<VoiceTokenResponse> {
  const response = await fetchFromHost(fetchFn, `${baseUrl}/voice/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  })
  return (await response.json()) as VoiceTokenResponse
}

/**
 * Mede o tempo de ida e volta até a API do host, útil para ver se o Radmin está em "relay".
 * Exemplo: `const ms = await measureHostPingMs('http://26.186.21.58:3000')`
 */
export async function measureHostPingMs(
  baseUrl: string,
  fetchFn: FetchFunction = fetch,
  now: ClockFunction = () => performance.now(),
): Promise<number> {
  const startedAt = now()
  await fetchFromHost(fetchFn, `${baseUrl}/health`, { cache: 'no-store' })
  return Math.round(now() - startedAt)
}

async function fetchFromHost(fetchFn: FetchFunction, url: string, init: RequestInit): Promise<Response> {
  const response = await fetchFn(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }).catch(
    (error: unknown) => {
      throw new Error(`Não foi possível falar com o host em ${url}: ${String(error)}. O host está ligado e no Radmin?`)
    },
  )
  if (!response.ok) {
    throw new Error(`Host respondeu ${response.status} em ${url}: ${await response.text()}`)
  }
  return response
}
