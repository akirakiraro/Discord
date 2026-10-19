import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { REALTIME_UNAUTHORIZED, type ClientToServerEvents, type ServerToClientEvents } from '@radcord/shared'
import type { AuthService } from '../auth/authService'
import type { RadcordSocketServer } from './realtimeBroadcaster'
import type { PresenceTracker } from './presenceTracker'

interface SocketData {
  userId: string
}

type RadcordSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

export interface RealtimeGatewayDependencies {
  auth: AuthService
  presence: PresenceTracker
}

/**
 * Sobe o Socket.IO no mesmo servidor HTTP da API, exigindo o token de sessão no handshake.
 * Exemplo: `broadcaster.attach(attachRealtimeGateway(app.server, { auth, presence }))`
 */
export function attachRealtimeGateway(httpServer: HttpServer, deps: RealtimeGatewayDependencies): RadcordSocketServer {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: true },
  })
  io.use((socket, next) => {
    const user = deps.auth.authenticate(readHandshakeToken(socket))
    if (!user) return next(new Error(REALTIME_UNAUTHORIZED))
    socket.data.userId = user.id
    next()
  })
  io.on('connection', (socket) => handleConnection(io, socket, deps.presence))
  return io
}

function readHandshakeToken(socket: RadcordSocket): string | undefined {
  const token: unknown = socket.handshake.auth.token
  return typeof token === 'string' ? token : undefined
}

function handleConnection(io: RadcordSocketServer, socket: RadcordSocket, presence: PresenceTracker): void {
  const { userId } = socket.data
  if (presence.connect(userId)) io.emit('presence:changed', { userId, online: true })

  socket.on('typing:start', (payload) => {
    if (typeof payload?.channelId !== 'string') return
    socket.broadcast.emit('typing:started', { channelId: payload.channelId, userId })
  })

  socket.on('disconnect', () => {
    if (presence.disconnect(userId)) io.emit('presence:changed', { userId, online: false })
  })
}
