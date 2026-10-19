import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@radcord/shared'

export type RadcordClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/**
 * Conecta no Socket.IO do host com o token da sessão; reconecta sozinho se o Radmin oscilar.
 * Exemplo: `const socket = connectRealtime('http://26.186.21.58:3000', token)`
 */
export function connectRealtime(baseUrl: string, token: string): RadcordClientSocket {
  return io(baseUrl, { auth: { token }, transports: ['websocket'] })
}
