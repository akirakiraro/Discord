import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { AuthResponse, ChannelDto, DevBotTokenResponse } from '@radcord/shared'
import { buildApp } from '../app'
import { IN_MEMORY_DATABASE, openDatabase } from '../db/database'
import { randomIdGenerator, systemClock } from '../platform/runtime'
import { createServerContext } from '../serverContext'
import type { VoiceGrantRequest, VoiceTokenIssuer } from '../voice/voiceTokenIssuer'

class FakeVoiceTokenIssuer implements VoiceTokenIssuer {
  readonly grants: VoiceGrantRequest[] = []

  async issue(request: VoiceGrantRequest): Promise<string> {
    this.grants.push(request)
    return `fake-token-${request.identity}`
  }
}

const LIVEKIT_URL = 'ws://26.186.21.58:7880'

describe('rota do bot de teste', () => {
  let app: FastifyInstance | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
  })

  async function start(devTools: boolean): Promise<{ app: FastifyInstance; issuer: FakeVoiceTokenIssuer }> {
    const issuer = new FakeVoiceTokenIssuer()
    const context = createServerContext({
      db: openDatabase(IN_MEMORY_DATABASE),
      tokenIssuer: issuer,
      livekitPublicUrl: LIVEKIT_URL,
      clock: systemClock,
      newId: randomIdGenerator,
    })
    app = await buildApp(context, { logger: false, devTools })
    return { app, issuer }
  }

  async function voiceChannelAndToken(server: FastifyInstance): Promise<{ token: string; channelId: string }> {
    const joined = (await server.inject({ method: 'POST', url: '/auth/join', payload: { username: 'akira' } })).json<AuthResponse>()
    const channels = (await server.inject({ method: 'GET', url: '/channels', headers: { authorization: `Bearer ${joined.token}` } })).json<ChannelDto[]>()
    const voice = channels.find((channel) => channel.kind === 'voice')
    if (!voice) throw new Error('canal de voz padrão ausente; esperado pelo menos um')
    return { token: joined.token, channelId: voice.id }
  }

  it('sem RADCORD_DEV_TOOLS a rota não existe', async () => {
    const { app: server } = await start(false)
    const { token, channelId } = await voiceChannelAndToken(server)
    const response = await server.inject({
      method: 'POST',
      url: '/dev/bot-token',
      headers: { authorization: `Bearer ${token}` },
      payload: { channelId, botNumber: 1 },
    })
    expect(response.statusCode).toBe(404)
  })

  it('ligada, assina um participante comum que publica', async () => {
    const { app: server, issuer } = await start(true)
    const { token, channelId } = await voiceChannelAndToken(server)
    const response = await server.inject({
      method: 'POST',
      url: '/dev/bot-token',
      headers: { authorization: `Bearer ${token}` },
      payload: { channelId, botNumber: 2 },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json<DevBotTokenResponse>()).toEqual({
      token: 'fake-token-dev-bot-2',
      livekitUrl: LIVEKIT_URL,
      identity: 'dev-bot-2',
      displayName: 'Bot de teste 2',
    })
    expect(issuer.grants).toEqual([
      { roomName: channelId, identity: 'dev-bot-2', displayName: 'Bot de teste 2', canPublish: true, hidden: false },
    ])
  })

  it('ligada, ainda exige alguém logado', async () => {
    const { app: server } = await start(true)
    const { channelId } = await voiceChannelAndToken(server)
    const response = await server.inject({ method: 'POST', url: '/dev/bot-token', payload: { channelId, botNumber: 1 } })
    expect(response.statusCode).toBe(401)
  })
})
