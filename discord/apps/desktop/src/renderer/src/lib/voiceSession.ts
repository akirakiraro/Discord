import { buildHostBaseUrl } from './hostAddress'
import { requestVoiceToken, type FetchFunction } from './hostApi'
import type { SavedConnection } from './savedConnection'

export interface VoiceSession {
  hostBaseUrl: string
  roomName: string
  displayName: string
  token: string
  livekitUrl: string
}

export const DEFAULT_VOICE_ROOM = 'geral'

/**
 * Resolve o endereço do host e busca o token, deixando tudo pronto para conectar no LiveKit.
 * Exemplo: `await openVoiceSession({ hostAddress: '26.186.21.58', displayName: 'Akira' })`
 */
export async function openVoiceSession(
  connection: SavedConnection,
  roomName: string = DEFAULT_VOICE_ROOM,
  fetchFn: FetchFunction = fetch,
): Promise<VoiceSession> {
  const hostBaseUrl = buildHostBaseUrl(connection.hostAddress)
  const displayName = connection.displayName.trim()
  const { token, livekitUrl } = await requestVoiceToken(hostBaseUrl, { displayName, roomName }, fetchFn)
  return { hostBaseUrl, roomName, displayName, token, livekitUrl }
}
