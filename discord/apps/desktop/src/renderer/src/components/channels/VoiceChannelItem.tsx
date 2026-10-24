import { useParticipants } from '@livekit/components-react'
import type { ChannelDto, VoiceOccupantDto } from '@radcord/shared'
import type { Participant } from 'livekit-client'
import { voiceSession } from '../../lib/voice/voiceSession'
import type { VoiceTokenSource } from '../../lib/voice/voiceSessionController'
import {
  occupantsInChannel,
  sidebarVoiceRows,
  type LiveVoiceIdentity,
  type SidebarVoiceRow,
} from '../../lib/voice/voiceRosterState'
import { useNavigationStore } from '../../stores/navigationStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useVoiceRosterStore } from '../../stores/voiceRosterStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { Avatar } from '../common/Avatar'
import { ParticipantRow } from '../voice/ParticipantRow'
import { useMemberFace } from '../voice/useMemberFace'

export function VoiceChannelItem({ channel }: { channel: ChannelDto }): React.JSX.Element {
  const api = useSessionStore((store) => store.session?.api)
  const occupants = occupantsInChannel(useVoiceRosterStore((store) => store.roster), channel.id)
  const connectedHere = useVoiceStore((store) => store.connection?.channelId === channel.id)
  const viewing = useNavigationStore((store) => store.view.kind === 'voice' && store.view.channelId === channel.id)

  return (
    <li>
      <button className={viewing ? 'channel-item channel-item--active' : 'channel-item'} onClick={() => joinChannel(api, channel.id)}>
        <span className="channel-item__icon">🔊</span>
        {channel.name}
      </button>
      {connectedHere ? <LiveChannelRoster occupants={occupants} /> : <PlainRoster occupants={occupants} />}
    </li>
  )
}

function joinChannel(api: VoiceTokenSource | undefined, channelId: string): void {
  useNavigationStore.getState().openVoiceChannel(channelId)
  if (api) void voiceSession.join(api, channelId)
}

function PlainRoster({ occupants }: { occupants: VoiceOccupantDto[] }): React.JSX.Element | null {
  if (occupants.length === 0) return null
  return (
    <ul className="voice-participants">
      {occupants.map((occupant) => (
        <RosterRow key={occupant.userId} userId={occupant.userId} displayName={occupant.displayName} />
      ))}
    </ul>
  )
}

function LiveChannelRoster({ occupants }: { occupants: VoiceOccupantDto[] }): React.JSX.Element | null {
  const participants = useParticipants()
  const rows = sidebarVoiceRows(occupants, participants.map(toLiveIdentity), true)
  if (rows.length === 0) return null
  return (
    <ul className="voice-participants">
      {rows.map((row) => (
        <SidebarEntry key={row.userId} row={row} participants={participants} />
      ))}
    </ul>
  )
}

function toLiveIdentity(participant: Participant): LiveVoiceIdentity {
  return { identity: participant.identity, name: participant.name || participant.identity }
}

function SidebarEntry({ row, participants }: { row: SidebarVoiceRow; participants: Participant[] }): React.JSX.Element {
  const participant = participants.find((item) => item.identity === row.userId)
  if (participant) return <ParticipantRow participant={participant} />
  return <RosterRow userId={row.userId} displayName={row.displayName} />
}

function RosterRow({ userId, displayName }: { userId: string; displayName: string }): React.JSX.Element {
  const face = useMemberFace(userId, displayName)
  return (
    <li className="participant-row">
      <Avatar name={face.name} seed={userId} imageUrl={face.imageUrl} size={24} />
      <span className="participant-row__name">{face.name}</span>
    </li>
  )
}
