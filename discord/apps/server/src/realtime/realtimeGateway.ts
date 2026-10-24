import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { REALTIME_UNAUTHORIZED, knownReleasePayload, type ClientToServerEvents, type ServerToClientEvents } from '@radcord/shared'
import type { AuthService } from '../auth/authService'
import type { ChannelService } from '../channels/channelService'
import type { UserRepository } from '../users/userRepository'
import type { RadcordSocketServer, RealtimeBroadcaster } from './realtimeBroadcaster'
import type { PresenceTracker } from './presenceTracker'
import { VoicePresenceHub } from './voicePresenceHub'
import type { VoiceRoster } from './voiceRoster'

interface SocketData {
  userId: string
}

type RadcordSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

export interface RealtimeGatewayDependencies {
  auth: AuthService
  presence: PresenceTracker
  channels: ChannelService
  users: UserRepository
  voiceRoster: VoiceRoster
  knownRelease: () => string | null
}

/**
 * Sobe o Socket.IO no mesmo servidor HTTP da API, exigindo o token de sessão no handshake.
 * Exemplo: `broadcaster.attach(attachRealtimeGateway(app.server, context))`
 */
export function attachRealtimeGateway(httpServer: HttpServer, deps: RealtimeGatewayDependencies): RadcordSocketServer {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: true },
  })
  const voice = createVoiceHub(io, deps)
  io.use((socket, next) => authorizeSocket(socket, deps.auth, next))
  io.on('connection', (socket) => handleConnection(io, socket, deps, voice))
  return io
}

function createVoiceHub(io: RadcordSocketServer, deps: RealtimeGatewayDependencies): VoicePresenceHub {
  return new VoicePresenceHub({
    roster: deps.voiceRoster,
    isVoiceChannel: (channelId) => deps.channels.isVoiceChannel(channelId),
    displayName: (userId) => deps.users.findById(userId)?.displayName,
    broadcast: socketBroadcast(io),
  })
}

function socketBroadcast(io: RadcordSocketServer): RealtimeBroadcaster {
  // O emit genérico do Socket.IO não aceita a união dos payloads; o broadcaster do chat faz o mesmo cast.
  const server = io as unknown as Server
  return {
    emit(event, payload) {
      server.emit(event, payload)
    },
  }
}

function authorizeSocket(socket: RadcordSocket, auth: AuthService, next: (error?: Error) => void): void {
  const user = auth.authenticate(readHandshakeToken(socket))
  if (!user) return next(new Error(REALTIME_UNAUTHORIZED))
  socket.data.userId = user.id
  next()
}

function readHandshakeToken(socket: RadcordSocket): string | undefined {
  const token: unknown = socket.handshake.auth.token
  return typeof token === 'string' ? token : undefined
}

function handleConnection(io: RadcordSocketServer, socket: RadcordSocket, deps: RealtimeGatewayDependencies, voice: VoicePresenceHub): void {
  const { userId } = socket.data
  if (deps.presence.connect(userId)) io.emit('presence:changed', { userId, online: true })
  // Quem abre o app no meio da call não está na sala do LiveKit; recebe o roster agora.
  socket.emit('voice:snapshot', voice.snapshot())
  emitKnownRelease(socket, deps.knownRelease())
  bindTyping(socket, userId)
  bindVoice(socket, userId, voice)
  socket.on('disconnect', () => dropConnection(io, deps.presence, voice, userId, socket.id))
}

function emitKnownRelease(socket: RadcordSocket, version: string | null): void {
  const payload = knownReleasePayload(version)
  if (!payload) return
  socket.emit('app:release', payload)
}

function bindTyping(socket: RadcordSocket, userId: string): void {
  socket.on('typing:start', (payload) => {
    if (typeof payload?.channelId !== 'string') return
    socket.broadcast.emit('typing:started', { channelId: payload.channelId, userId })
  })
}

function bindVoice(socket: RadcordSocket, userId: string, voice: VoicePresenceHub): void {
  socket.on('voice:join', (payload) => voice.join(userId, socket.id, payload))
  socket.on('voice:leave', () => voice.leave(userId, socket.id))
}

function dropConnection(io: RadcordSocketServer, presence: PresenceTracker, voice: VoicePresenceHub, userId: string, socketId: string): void {
  voice.leave(userId, socketId)
  if (presence.disconnect(userId)) io.emit('presence:changed', { userId, online: false })
}
