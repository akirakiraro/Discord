import { RoomAudioRenderer, RoomContext } from '@livekit/components-react'
import { useOpenFirstTextChannel } from '../../hooks/useOpenFirstTextChannel'
import { useRealtimeConnection } from '../../hooks/useRealtimeConnection'
import { voiceRoom } from '../../lib/voice/voiceSession'
import type { AuthSession } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { ChannelSidebar } from '../channels/ChannelSidebar'
import { MemberList } from '../members/MemberList'
import { RealtimeContext } from '../RealtimeContext'
import { MainPanel } from './MainPanel'

interface AppShellProps {
  session: AuthSession
}

export function AppShell({ session }: AppShellProps): React.JSX.Element {
  const { socket, connected } = useRealtimeConnection(session)
  const inVoice = useVoiceStore((store) => store.connection !== null)
  const deafened = useVoiceStore((store) => store.deafened)
  useOpenFirstTextChannel()

  return (
    <RealtimeContext.Provider value={socket}>
      <RoomContext.Provider value={voiceRoom}>
        <div className="app-shell">
          <ChannelSidebar />
          <MainPanel />
          <MemberList />
        </div>
        {inVoice && <RoomAudioRenderer muted={deafened} />}
        {!connected && <div className="connection-banner">Reconectando ao host…</div>}
      </RoomContext.Provider>
    </RealtimeContext.Provider>
  )
}
