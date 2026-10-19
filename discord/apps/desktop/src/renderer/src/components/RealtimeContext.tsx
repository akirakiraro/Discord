import { createContext, useContext } from 'react'
import type { RadcordClientSocket } from '../lib/realtime/realtimeClient'

export const RealtimeContext = createContext<RadcordClientSocket | null>(null)

/** Exemplo: `const socket = useRealtimeSocket(); socket?.emit('typing:start', { channelId })` */
export function useRealtimeSocket(): RadcordClientSocket | null {
  return useContext(RealtimeContext)
}
