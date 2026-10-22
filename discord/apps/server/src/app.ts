import Fastify, { type FastifyError, type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import type { ApiErrorResponse, HostHealthResponse } from '@radcord/shared'
import { registerAuthRoutes } from './auth/authRoutes'
import { registerChannelRoutes } from './channels/channelRoutes'
import { HttpError } from './http/httpError'
import { registerMessageRoutes } from './messages/messageRoutes'
import type { ServerContext } from './serverContext'
import { registerMemberRoutes } from './users/memberRoutes'
import { registerUpdateStatic } from './updates/updateStatic'
import { registerClientReportRoutes } from './reports/clientReportRoutes'
import { registerVoiceRoutes } from './voice/voiceRoutes'

/**
 * Monta a API HTTP do host com todas as rotas.
 * Exemplo: `const app = await buildApp(createServerContext(inputs), { logger: true })`
 */
export async function buildApp(context: ServerContext, options: { logger: boolean; updatesDir?: string }): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger })
  // O renderer do Electron empacotado roda em file://, que manda Origin "null".
  await app.register(cors, { origin: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'] })
  app.setErrorHandler(sendErrorResponse)
  // O app faz ping a cada 3 s; logar cada um afogaria o log do host.
  app.get('/health', { logLevel: 'warn' }, async (): Promise<HostHealthResponse> => ({
    status: 'ok',
    livekitUrl: context.livekitPublicUrl,
  }))
  registerAuthRoutes(app, context.auth)
  registerChannelRoutes(app, context.auth, context.channels)
  registerMessageRoutes(app, context.auth, context.messages)
  registerMemberRoutes(app, context.auth, context.users, context.presence)
  registerVoiceRoutes(app, context)
  registerClientReportRoutes(app, context.auth, context.clientReportsPath, context.clock)
  await registerUpdateStatic(app, options.updatesDir ?? '')
  return app
}

function sendErrorResponse(error: FastifyError, request: FastifyRequest, reply: FastifyReply): FastifyReply {
  if (error instanceof HttpError) {
    return reply.code(error.statusCode).send({ error: error.code, message: error.message } satisfies ApiErrorResponse)
  }
  if (error.statusCode && error.statusCode < 500) {
    return reply.code(error.statusCode).send({ error: error.code ?? 'bad_request', message: error.message })
  }
  request.log.error({ event: 'unhandled_error', err: error })
  return reply.code(500).send({ error: 'internal_error', message: 'Erro inesperado no host' } satisfies ApiErrorResponse)
}
