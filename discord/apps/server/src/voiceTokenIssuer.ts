import { randomUUID } from 'node:crypto'
import { AccessToken } from 'livekit-server-sdk'
import type { VoiceTokenRequest } from '@radcord/shared'

export interface VoiceTokenIssuer {
  issue(request: VoiceTokenRequest): Promise<string>
}

const TOKEN_TTL = '6h'

/**
 * Assina tokens de acesso às salas de voz do LiveKit.
 * Exemplo: `await new LiveKitTokenIssuer(key, secret).issue({ displayName: 'Akira', roomName: 'geral' })`
 */
export class LiveKitTokenIssuer implements VoiceTokenIssuer {
  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  async issue(request: VoiceTokenRequest): Promise<string> {
    const accessToken = new AccessToken(this.apiKey, this.apiSecret, {
      identity: buildParticipantIdentity(request.displayName),
      name: request.displayName,
      ttl: TOKEN_TTL,
    })
    accessToken.addGrant({ room: request.roomName, roomJoin: true, canPublish: true, canSubscribe: true })
    return accessToken.toJwt()
  }
}

/**
 * Identidade única por conexão: o LiveKit derruba a sessão antiga quando
 * duas pessoas entram com a mesma identidade (ex.: dois amigos com o mesmo apelido).
 * Exemplo: `buildParticipantIdentity('Akira', 'ab12cd34')` → `'Akira#ab12cd34'`
 */
export function buildParticipantIdentity(displayName: string, suffix: string = randomUUID().slice(0, 8)): string {
  return `${displayName}#${suffix}`
}
