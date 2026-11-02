import type { FastifyInstance } from 'fastify'
import { devBotIdentity, devBotName, devBotTokenRequestSchema, type DevBotTokenResponse } from '@radcord/shared'
import { requireCurrentUser } from '../http/currentUser'
import { parseRequest } from '../http/httpError'
import type { VoiceRouteDependencies } from '../voice/voiceRoutes'

/**
 * Token para o bot de teste entrar num canal de voz como uma pessoa.
 * Só é registrada com `RADCORD_DEV_TOOLS=1`; sem isso a rota não existe (404).
 * Exige alguém logado: o bot age em nome de quem o chamou.
 * Exemplo: `registerDevBotRoutes(app, deps)` → POST /dev/bot-token { channelId, botNumber }
 */
export function registerDevBotRoutes(app: FastifyInstance, deps: VoiceRouteDependencies): void {
  app.post('/dev/bot-token', async (request): Promise<DevBotTokenResponse> => {
    const user = requireCurrentUser(request, deps.auth)
    const { channelId, botNumber } = parseRequest(devBotTokenRequestSchema, request.body)
    const channel = deps.channels.requireChannel(channelId, 'voice')
    const identity = devBotIdentity(botNumber)
    const displayName = devBotName(botNumber)
    const token = await deps.tokenIssuer.issue({ roomName: channel.id, identity, displayName, canPublish: true, hidden: false })
    request.log.info({ event: 'dev_bot_token_issued', userId: user.id, channelId: channel.id, identity })
    return { token, livekitUrl: deps.livekitPublicUrl, identity, displayName }
  })
}
