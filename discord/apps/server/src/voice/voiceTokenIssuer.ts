import { AccessToken } from 'livekit-server-sdk'

export interface VoiceGrantRequest {
  roomName: string
  identity: string
  displayName: string
}

export interface VoiceTokenIssuer {
  issue(request: VoiceGrantRequest): Promise<string>
}

const TOKEN_TTL = '6h'

/**
 * Assina tokens de acesso às salas de voz do LiveKit.
 * A identidade é o id do usuário: entrar de outro PC derruba a sessão de voz antiga, como no Discord.
 * Exemplo: `await issuer.issue({ roomName: channel.id, identity: user.id, displayName: user.displayName })`
 */
export class LiveKitTokenIssuer implements VoiceTokenIssuer {
  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  async issue(request: VoiceGrantRequest): Promise<string> {
    const accessToken = new AccessToken(this.apiKey, this.apiSecret, {
      identity: request.identity,
      name: request.displayName,
      ttl: TOKEN_TTL,
    })
    accessToken.addGrant({ room: request.roomName, roomJoin: true, canPublish: true, canSubscribe: true })
    return accessToken.toJwt()
  }
}
