import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import {
  voiceTokenRequestSchema,
  type HostHealthResponse,
  type VoiceTokenResponse,
} from '@radcord/shared'
import type { VoiceTokenIssuer } from './voiceTokenIssuer'

export interface AppDependencies {
  livekitPublicUrl: string
  tokenIssuer: VoiceTokenIssuer
  logger: boolean
}

/**
 * Monta a API HTTP do host (health/ping e emissão de tokens de voz).
 * Exemplo: `const app = await buildApp({ livekitPublicUrl, tokenIssuer, logger: true })`
 */
export async function buildApp(deps: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({ logger: deps.logger })
  // O renderer do Electron empacotado roda em file://, que manda Origin "null".
  await app.register(cors, { origin: true })
  registerHealthRoute(app, deps.livekitPublicUrl)
  registerVoiceTokenRoute(app, deps)
  return app
}

function registerHealthRoute(app: FastifyInstance, livekitUrl: string): void {
  app.get('/health', async (): Promise<HostHealthResponse> => ({ status: 'ok', livekitUrl }))
}

function registerVoiceTokenRoute(app: FastifyInstance, deps: AppDependencies): void {
  app.post('/voice/token', async (request, reply) => {
    const parsed = voiceTokenRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      return reply.code(400).send({ error: 'invalid_request', issues, received: request.body })
    }
    const token = await deps.tokenIssuer.issue(parsed.data)
    request.log.info({ event: 'voice_token_issued', ...parsed.data })
    const response: VoiceTokenResponse = { token, livekitUrl: deps.livekitPublicUrl }
    return response
  })
}
