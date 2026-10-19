import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { AuthResponse, ChannelDto } from '@radcord/shared'
import { buildApp } from './app'
import { IN_MEMORY_DATABASE, openDatabase } from './db/database'
import { randomIdGenerator, systemClock } from './platform/runtime'
import { createServerContext } from './serverContext'
import { PlainTextPasswordHasher } from './testing/fakes'
import type { VoiceGrantRequest, VoiceTokenIssuer } from './voice/voiceTokenIssuer'

class FakeVoiceTokenIssuer implements VoiceTokenIssuer {
  readonly grants: VoiceGrantRequest[] = []

  async issue(request: VoiceGrantRequest): Promise<string> {
    this.grants.push(request)
    return `fake-token-${request.identity}`
  }
}

const LIVEKIT_URL = 'ws://26.186.21.58:7880'

describe('API do host', () => {
  let app: FastifyInstance
  let issuer: FakeVoiceTokenIssuer

  beforeEach(async () => {
    issuer = new FakeVoiceTokenIssuer()
    const context = createServerContext({
      db: openDatabase(IN_MEMORY_DATABASE),
      hasher: new PlainTextPasswordHasher(),
      tokenIssuer: issuer,
      livekitPublicUrl: LIVEKIT_URL,
      clock: systemClock,
      newId: randomIdGenerator,
    })
    app = await buildApp(context, { logger: false })
  })

  afterEach(async () => {
    await app.close()
  })

  async function register(username: string): Promise<AuthResponse> {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, displayName: username.toUpperCase(), password: 'segredo' },
    })
    return response.json<AuthResponse>()
  }

  async function listChannels(token: string): Promise<ChannelDto[]> {
    const response = await app.inject({ method: 'GET', url: '/channels', headers: { authorization: `Bearer ${token}` } })
    return response.json<ChannelDto[]>()
  }

  it('GET /health responde sem login', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.json()).toEqual({ status: 'ok', livekitUrl: LIVEKIT_URL })
  })

  it('rotas protegidas respondem 401 sem token', async () => {
    const response = await app.inject({ method: 'GET', url: '/channels' })

    expect(response.statusCode).toBe(401)
    expect(response.json().error).toBe('unauthorized')
  })

  it('cadastro inválido responde 400 citando o valor recebido', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { username: 'a' } })

    expect(response.statusCode).toBe(400)
    expect(response.json().message).toContain('"username":"a"')
  })

  it('fluxo completo: cadastro, canais padrão, mensagem, histórico e membros', async () => {
    const { token, user } = await register('akira')
    const headers = { authorization: `Bearer ${token}` }
    const textChannel = (await listChannels(token)).find((channel) => channel.kind === 'text')

    const sent = await app.inject({ method: 'POST', url: `/channels/${textChannel?.id}/messages`, headers, payload: { content: 'oi' } })
    const history = await app.inject({ method: 'GET', url: `/channels/${textChannel?.id}/messages`, headers })
    const members = await app.inject({ method: 'GET', url: '/members', headers })

    expect(sent.statusCode).toBe(201)
    expect(history.json().messages.map((message: { content: string }) => message.content)).toEqual(['oi'])
    expect(members.json()).toEqual([{ ...user, online: false }])
  })

  it('outro usuário não consegue apagar a mensagem', async () => {
    const author = await register('akira')
    const intruder = await register('bia')
    const textChannel = (await listChannels(author.token)).find((channel) => channel.kind === 'text')
    const sent = await app.inject({
      method: 'POST',
      url: `/channels/${textChannel?.id}/messages`,
      headers: { authorization: `Bearer ${author.token}` },
      payload: { content: 'minha' },
    })

    const attempt = await app.inject({
      method: 'DELETE',
      url: `/messages/${sent.json().id}`,
      headers: { authorization: `Bearer ${intruder.token}` },
    })

    expect(attempt.statusCode).toBe(403)
  })

  it('POST /voice/token emite token para o canal de voz com o usuário logado', async () => {
    const { token, user } = await register('akira')
    const voiceChannel = (await listChannels(token)).find((channel) => channel.kind === 'voice')

    const response = await app.inject({
      method: 'POST',
      url: '/voice/token',
      headers: { authorization: `Bearer ${token}` },
      payload: { channelId: voiceChannel?.id },
    })

    expect(response.json()).toEqual({ token: `fake-token-${user.id}`, livekitUrl: LIVEKIT_URL })
    expect(issuer.grants).toEqual([{ roomName: voiceChannel?.id, identity: user.id, displayName: 'AKIRA' }])
  })
})
