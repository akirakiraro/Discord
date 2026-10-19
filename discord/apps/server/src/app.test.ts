import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { VoiceTokenRequest } from '@radcord/shared'
import { buildApp } from './app'
import type { VoiceTokenIssuer } from './voiceTokenIssuer'

class FakeVoiceTokenIssuer implements VoiceTokenIssuer {
  readonly receivedRequests: VoiceTokenRequest[] = []

  async issue(request: VoiceTokenRequest): Promise<string> {
    this.receivedRequests.push(request)
    return `fake-token-for-${request.displayName}`
  }
}

const LIVEKIT_URL = 'ws://26.186.21.58:7880'

describe('buildApp', () => {
  let app: FastifyInstance
  let issuer: FakeVoiceTokenIssuer

  beforeEach(async () => {
    issuer = new FakeVoiceTokenIssuer()
    app = await buildApp({ livekitPublicUrl: LIVEKIT_URL, tokenIssuer: issuer, logger: false })
  })

  afterEach(async () => {
    await app.close()
  })

  it('GET /health responde ok com a URL do LiveKit', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok', livekitUrl: LIVEKIT_URL })
  })

  it('POST /voice/token devolve token e URL do LiveKit', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/voice/token',
      payload: { displayName: 'Akira', roomName: 'geral' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ token: 'fake-token-for-Akira', livekitUrl: LIVEKIT_URL })
    expect(issuer.receivedRequests, 'issuer recebe o pedido validado').toEqual([
      { displayName: 'Akira', roomName: 'geral' },
    ])
  })

  it('POST /voice/token rejeita corpo inválido sem emitir token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/voice/token',
      payload: { displayName: '', roomName: 'Sala Geral' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error).toBe('invalid_request')
    expect(issuer.receivedRequests, 'nenhum token deve ser emitido').toHaveLength(0)
  })
})
