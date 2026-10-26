import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { io, type Socket } from 'socket.io-client'
import {
  REALTIME_UNAUTHORIZED,
  type AuthResponse,
  type ChannelDto,
  type MessageDto,
  type PresenceChangedPayload,
  type TypingPayload,
  type VoiceLeftPayload,
  type VoiceOccupantDto,
} from '@radcord/shared'
import { buildApp } from '../app'
import { IN_MEMORY_DATABASE, openDatabase } from '../db/database'
import { randomIdGenerator, systemClock } from '../platform/runtime'
import { createServerContext, type ServerContext } from '../serverContext'
import type { VoiceTokenIssuer } from '../voice/voiceTokenIssuer'
import { attachRealtimeGateway } from './realtimeGateway'

const LIVEKIT_URL = 'ws://127.0.0.1:7880'
const WAIT_MS = 2000

const issuer: VoiceTokenIssuer = { issue: async () => 'unused' }

describe('socket.io de verdade', () => {
  let app: FastifyInstance
  let context: ServerContext
  let url = ''
  const sockets: Socket[] = []

  afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.close()
    if (app) await app.close()
  })

  it('rejeita o handshake sem token e com token inválido', async () => {
    await boot()

    await expect(outcome(url, undefined, sockets)).resolves.toBe(REALTIME_UNAUTHORIZED)
    await expect(outcome(url, 'token-falso', sockets)).resolves.toBe(REALTIME_UNAUTHORIZED)
  })

  it('entrega presença, mensagem, digitação e a entrada e saída da call', async () => {
    await boot()
    const akira = await join(app, 'akira')
    const bia = await join(app, 'bia')
    const voice = await channelOf(app, akira.token, 'voice')
    const text = await channelOf(app, akira.token, 'text')
    const biaSocket = track(openSocket(url, bia.token), sockets)
    await connected(biaSocket)

    const online = waitFor(biaSocket, 'presence:changed', (row: PresenceChangedPayload) => row.userId === akira.user.id && row.online)
    const akiraSocket = track(openSocket(url, akira.token), sockets)
    await connected(akiraSocket)
    await expect(online).resolves.toMatchObject({ userId: akira.user.id, online: true })

    const created = waitFor(biaSocket, 'message:created', (row: MessageDto) => row.content === 'oi')
    const typing = waitFor(biaSocket, 'typing:started', (row: TypingPayload) => row.userId === akira.user.id)
    const sent = await app.inject({
      method: 'POST',
      url: `/channels/${text.id}/messages`,
      headers: { authorization: `Bearer ${akira.token}` },
      payload: { content: 'oi' },
    })
    akiraSocket.emit('typing:start', { channelId: text.id })

    expect(sent.statusCode).toBe(201)
    await expect(created).resolves.toMatchObject({ content: 'oi', authorId: akira.user.id })
    await expect(typing).resolves.toMatchObject({ channelId: text.id, userId: akira.user.id })

    const joined = waitFor(biaSocket, 'voice:joined', (row: VoiceOccupantDto) => row.userId === akira.user.id)
    akiraSocket.emit('voice:join', { channelId: voice.id })
    await expect(joined).resolves.toMatchObject({ channelId: voice.id, userId: akira.user.id, displayName: 'akira' })

    const left = waitFor(biaSocket, 'voice:left', (row: VoiceLeftPayload) => row.userId === akira.user.id)
    akiraSocket.emit('voice:leave')
    await expect(left).resolves.toMatchObject({ channelId: voice.id, userId: akira.user.id })

    const offline = waitFor(biaSocket, 'presence:changed', (row: PresenceChangedPayload) => row.userId === akira.user.id && row.online === false)
    akiraSocket.disconnect()
    await expect(offline).resolves.toMatchObject({ userId: akira.user.id, online: false })
  })

  async function boot(): Promise<void> {
    context = createServerContext({
      db: openDatabase(IN_MEMORY_DATABASE),
      tokenIssuer: issuer,
      livekitPublicUrl: LIVEKIT_URL,
      clock: systemClock,
      newId: randomIdGenerator,
    })
    app = await buildApp(context, { logger: false })
    context.broadcaster.attach(attachRealtimeGateway(app.server, { ...context, knownRelease: () => null }))
    url = await listenOnFreePort(app)
  }
})

async function listenOnFreePort(app: FastifyInstance): Promise<string> {
  await app.listen({ host: '127.0.0.1', port: 0 })
  const address = app.server.address()
  if (!address || typeof address === 'string') throw new Error('listen na porta 0 não devolveu uma porta TCP')
  return `http://127.0.0.1:${address.port}`
}

async function join(app: FastifyInstance, username: string): Promise<AuthResponse> {
  const response = await app.inject({ method: 'POST', url: '/auth/join', payload: { username } })
  return response.json<AuthResponse>()
}

async function channelOf(app: FastifyInstance, token: string, kind: ChannelDto['kind']): Promise<ChannelDto> {
  const response = await app.inject({ method: 'GET', url: '/channels', headers: { authorization: `Bearer ${token}` } })
  const found = response.json<ChannelDto[]>().find((channel) => channel.kind === kind)
  if (!found) throw new Error(`canal ${kind} ausente depois do cadastro; esperado o canal padrão`)
  return found
}

function openSocket(url: string, token: string): Socket {
  return io(url, { reconnection: false, transports: ['websocket'], auth: { token } })
}

function track(socket: Socket, sockets: Socket[]): Socket {
  sockets.push(socket)
  return socket
}

function outcome(url: string, token: string | undefined, sockets: Socket[]): Promise<string> {
  const socket = io(url, {
    reconnection: false,
    transports: ['websocket'],
    auth: token === undefined ? {} : { token },
  })
  sockets.push(socket)
  return firstSignal(socket)
}

function firstSignal(socket: Socket): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('handshake sem resposta; esperado unauthorized ou connect')), WAIT_MS)
    socket.on('connect', () => finish('open'))
    socket.on('connect_error', (error: Error) => finish(error.message))

    function finish(value: string): void {
      clearTimeout(timer)
      resolve(value)
    }
  })
}

function connected(socket: Socket): Promise<void> {
  if (socket.connected) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket autenticado não conectou')), WAIT_MS)
    socket.once('connect', () => {
      clearTimeout(timer)
      resolve()
    })
    socket.once('connect_error', (error: Error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

function waitFor<T>(socket: Socket, event: string, match: (payload: T) => boolean): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`evento ${event} não chegou no outro cliente`)), WAIT_MS)
    socket.on(event, (payload: T) => {
      if (!match(payload)) return
      clearTimeout(timer)
      resolve(payload)
    })
  })
}
