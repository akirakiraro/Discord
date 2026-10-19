import type { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '@radcord/shared'

export type RadcordSocketServer = Server<ClientToServerEvents, ServerToClientEvents>
export type ServerEventName = keyof ServerToClientEvents
export type ServerEventPayload<E extends ServerEventName> = Parameters<ServerToClientEvents[E]>[0]

export interface RealtimeBroadcaster {
  emit<E extends ServerEventName>(event: E, payload: ServerEventPayload<E>): void
}

/**
 * Broadcaster ligado ao Socket.IO depois que o servidor HTTP existe; antes disso descarta eventos.
 * Exemplo: `broadcaster.attach(io); broadcaster.emit('channel:created', channel)`
 */
export class SocketIoBroadcaster implements RealtimeBroadcaster {
  private server: Server | null = null

  attach(server: RadcordSocketServer): void {
    this.server = server as unknown as Server
  }

  emit<E extends ServerEventName>(event: E, payload: ServerEventPayload<E>): void {
    this.server?.emit(event, payload)
  }
}
