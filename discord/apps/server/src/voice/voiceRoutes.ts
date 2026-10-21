import type { FastifyInstance } from 'fastify'
import { monitorIdentity, voiceTokenRequestSchema, type VoiceTokenResponse } from '@radcord/shared'
import type { AuthService } from '../auth/authService'
import type { ChannelService } from '../channels/channelService'
import { requireCurrentUser } from '../http/currentUser'
import { parseRequest } from '../http/httpError'
import type { VoiceTokenIssuer } from './voiceTokenIssuer'

export interface VoiceRouteDependencies {
  auth: AuthService
  channels: ChannelService
  tokenIssuer: VoiceTokenIssuer
  livekitPublicUrl: string
}

/**
 * Exemplo: `registerVoiceRoutes(app, deps)` → POST /voice/token { channelId }
 */
export function registerVoiceRoutes(app: FastifyInstance, deps: VoiceRouteDependencies): void {
  app.post('/voice/token', async (request): Promise<VoiceTokenResponse> => {
    const user = requireCurrentUser(request, deps.auth)
    const { channelId, monitor } = parseRequest(voiceTokenRequestSchema, request.body)
    const channel = deps.channels.requireChannel(channelId, 'voice')
    const listening = monitor === true
    const token = await deps.tokenIssuer.issue({
      roomName: channel.id,
      identity: listening ? monitorIdentity(user.id) : user.id,
      displayName: user.displayName,
      canPublish: !listening,
      hidden: listening,
    })
    request.log.info({ event: 'voice_token_issued', userId: user.id, channelId: channel.id, monitor: listening })
    return { token, livekitUrl: deps.livekitPublicUrl }
  })
}
