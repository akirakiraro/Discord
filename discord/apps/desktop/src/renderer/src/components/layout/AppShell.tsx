import { RoomContext } from '@livekit/components-react'
import { useOpenFirstTextChannel } from '../../hooks/useOpenFirstTextChannel'
import { useRealtimeConnection } from '../../hooks/useRealtimeConnection'
import { voiceRoom } from '../../lib/voice/voiceSession'
import type { AuthSession } from '../../stores/sessionStore'
import { useMembersPanelStore } from '../../stores/membersPanelStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { CallPlayback } from '../voice/CallPlayback'
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
  const membersOpen = useMembersPanelStore((store) => store.open)
  useOpenFirstTextChannel()

  return (
    <RealtimeContext.Provider value={socket}>
      <RoomContext.Provider value={voiceRoom}>
        <div className={membersOpen ? 'app-shell' : 'app-shell app-shell--no-members'}>
          <ChannelSidebar />
          <MainPanel />
          {membersOpen && <MemberList />}
        </div>
        {inVoice && <CallPlayback deafened={deafened} />}
        {!connected && <div className="connection-banner">Reconectando ao host…</div>}
      </RoomContext.Provider>
    </RealtimeContext.Provider>
  )
}
