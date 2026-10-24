import { useEffect, useState } from 'react'
import { REALTIME_UNAUTHORIZED } from '@radcord/shared'
import type { RadcordApiClient } from '../lib/api/apiClient'
import { withInitialData } from '../lib/chat/chatState'
import { bindRealtimeEvents } from '../lib/realtime/realtimeBindings'
import { connectRealtime, type RadcordClientSocket } from '../lib/realtime/realtimeClient'
import { bindVoiceAnnouncements, voiceChannelSource } from '../lib/voice/announceVoiceSeat'
import { useChatStore } from '../stores/chatStore'
import { useSessionStore, type AuthSession } from '../stores/sessionStore'
import { useVoiceRosterStore } from '../stores/voiceRosterStore'
import { useVoiceStore } from '../stores/voiceStore'

export interface RealtimeConnection {
  socket: RadcordClientSocket | null
  connected: boolean
}

async function loadInitialChatData(api: RadcordApiClient): Promise<void> {
  const [channels, members] = await Promise.all([api.listChannels(), api.listMembers()])
  useChatStore.getState().applyChat((state) => withInitialData(state, channels, members))
}

/**
 * Mantém o Socket.IO aberto enquanto há sessão e recarrega canais/membros a cada (re)conexão,
 * já que eventos perdidos durante a queda não são reenviados. A presença de voz volta no
 * `voice:snapshot` que o host manda ao conectar.
 * Exemplo: `const { socket, connected } = useRealtimeConnection(session)`
 */
export function useRealtimeConnection(session: AuthSession): RealtimeConnection {
  const [connection, setConnection] = useState<RealtimeConnection>({ socket: null, connected: false })

  useEffect(() => {
    const socket = connectRealtime(session.api.baseUrl, session.token)
    const { applyChat, applyTyping } = useChatStore.getState()
    const { applyRoster } = useVoiceRosterStore.getState()
    bindRealtimeEvents(socket, { applyChat, applyTyping, applyRoster, nowMs: Date.now })
    const stopVoice = bindVoiceAnnouncements(socket, voiceChannelSource(useVoiceStore))
    socket.on('connect', () => {
      setConnection({ socket, connected: true })
      void loadInitialChatData(session.api)
    })
    socket.on('disconnect', () => setConnection({ socket, connected: false }))
    socket.on('connect_error', (error) => {
      if (error.message === REALTIME_UNAUTHORIZED) useSessionStore.getState().signOut('Sua sessão expirou; entre de novo.')
    })
    setConnection({ socket, connected: false })
    return () => {
      stopVoice()
      socket.disconnect()
    }
  }, [session])

  return connection
}
