import type { FastifyInstance } from 'fastify'
import { createChannelRequestSchema, type ChannelDto } from '@radcord/shared'
import type { AuthService } from '../auth/authService'
import { requireCurrentUser } from '../http/currentUser'
import { parseRequest } from '../http/httpError'
import type { ChannelService } from './channelService'

/**
 * Exemplo: `registerChannelRoutes(app, auth, channels)` → GET /channels, POST /channels
 */
export function registerChannelRoutes(app: FastifyInstance, auth: AuthService, channels: ChannelService): void {
  app.get('/channels', async (request): Promise<ChannelDto[]> => {
    requireCurrentUser(request, auth)
    return channels.list()
  })

  app.post('/channels', async (request, reply): Promise<ChannelDto> => {
    requireCurrentUser(request, auth)
    const channel = channels.create(parseRequest(createChannelRequestSchema, request.body))
    reply.code(201)
    return channel
  })
}
