import { useParticipants } from '@livekit/components-react'
import { ParticipantRow } from './ParticipantRow'
import { UserPanel } from './UserPanel'
import type { VoiceSession } from '../lib/voiceSession'

interface ChannelSidebarProps {
  session: VoiceSession
  deafened: boolean
  onToggleDeafen: () => void
}

export function ChannelSidebar({ session, deafened, onToggleDeafen }: ChannelSidebarProps): React.JSX.Element {
  const participants = useParticipants()

  return (
    <aside className="channel-sidebar">
      <header className="channel-sidebar__header">Radcord</header>
      <div className="channel-sidebar__channels">
        <p className="channel-sidebar__category">Canais de voz</p>
        <div className="voice-channel voice-channel--active">🔊 {session.roomName}</div>
        <ul className="participant-list">
          {participants.map((participant) => (
            <ParticipantRow key={participant.identity} participant={participant} />
          ))}
        </ul>
      </div>
      <UserPanel session={session} deafened={deafened} onToggleDeafen={onToggleDeafen} />
    </aside>
  )
}
