import type { FastifyInstance } from 'fastify'
import { messageContentSchema, messageHistoryQuerySchema, type MessageDto, type MessagePageDto } from '@radcord/shared'
import type { AuthService } from '../auth/authService'
import { requireCurrentUser } from '../http/currentUser'
import { parseRequest } from '../http/httpError'
import type { MessageService } from './messageService'

interface ChannelParams {
  channelId: string
}

interface MessageParams {
  messageId: string
}

/**
 * Exemplo: `registerMessageRoutes(app, auth, messages)` →
 * GET/POST /channels/:channelId/messages, PATCH/DELETE /messages/:messageId
 */
export function registerMessageRoutes(app: FastifyInstance, auth: AuthService, messages: MessageService): void {
  app.get<{ Params: ChannelParams }>('/channels/:channelId/messages', async (request): Promise<MessagePageDto> => {
    requireCurrentUser(request, auth)
    return messages.history(request.params.channelId, parseRequest(messageHistoryQuerySchema, request.query))
  })

  app.post<{ Params: ChannelParams }>('/channels/:channelId/messages', async (request, reply): Promise<MessageDto> => {
    const user = requireCurrentUser(request, auth)
    const { content, imageUrl } = parseRequest(messageContentSchema, request.body)
    reply.code(201)
    return messages.send(user.id, request.params.channelId, content, imageUrl ?? null)
  })

  app.patch<{ Params: MessageParams }>('/messages/:messageId', async (request): Promise<MessageDto> => {
    const user = requireCurrentUser(request, auth)
    const { content } = parseRequest(messageContentSchema, request.body)
    return messages.edit(user.id, request.params.messageId, content)
  })

  app.delete<{ Params: MessageParams }>('/messages/:messageId', async (request, reply) => {
    const user = requireCurrentUser(request, auth)
    messages.remove(user.id, request.params.messageId)
    return reply.code(204).send()
  })
}
