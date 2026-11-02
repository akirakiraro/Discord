import type { ChannelDto, DevBotTokenResponse } from '@radcord/shared'

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

/**
 * Acha o canal de voz pelo id ou pelo nome (sem diferenciar maiúsculas).
 * Exemplo: `await resolveVoiceChannel(api, sessao, 'Geral', fetch)`
 */
export async function resolveVoiceChannel(apiUrl: string, session: string, wanted: string, fetchFn: FetchLike): Promise<ChannelDto> {
  const channels = await call<ChannelDto[]>(fetchFn, `${apiUrl}/channels`, { headers: auth(session) })
  const voice = channels.filter((channel) => channel.kind === 'voice')
  const name = wanted.trim().toLowerCase()
  const found = voice.find((channel) => channel.id === wanted || channel.name.toLowerCase() === name)
  if (!found) {
    const names = voice.map((channel) => channel.name).join(', ')
    throw new Error(`canal de voz ${JSON.stringify(wanted)} não existe; os canais de voz são: ${names}`)
  }
  return found
}

/**
 * Pede o token do bot. 404 quer dizer host sem `RADCORD_DEV_TOOLS=1`.
 * Exemplo: `await requestBotToken(api, sessao, canal.id, 1, fetch)`
 */
export async function requestBotToken(
  apiUrl: string,
  session: string,
  channelId: string,
  botNumber: number,
  fetchFn: FetchLike,
): Promise<DevBotTokenResponse> {
  return call<DevBotTokenResponse>(fetchFn, `${apiUrl}/dev/bot-token`, {
    method: 'POST',
    headers: { ...auth(session), 'content-type': 'application/json' },
    body: JSON.stringify({ channelId, botNumber }),
  })
}

async function call<T>(fetchFn: FetchLike, url: string, init: RequestInit): Promise<T> {
  const response = await fetchFn(url, { ...init, signal: AbortSignal.timeout(8000) }).catch((error: unknown) => {
    throw new Error(`host não respondeu em ${url}: ${String(error)}. O host está ligado e no Radmin?`)
  })
  if (response.status === 404 && url.endsWith('/dev/bot-token')) {
    throw new Error('o host não tem a rota do bot. Ligue o host com RADCORD_DEV_TOOLS=1 (o "Ligar host" do npm run desktop já liga).')
  }
  if (response.status === 401) throw new Error('sessão recusada pelo host (401); entre de novo no app')
  if (!response.ok) throw new Error(`host respondeu ${response.status} em ${url}: ${await response.text()}`)
  return (await response.json()) as T
}

function auth(session: string): Record<string, string> {
  return { authorization: `Bearer ${session}` }
}
