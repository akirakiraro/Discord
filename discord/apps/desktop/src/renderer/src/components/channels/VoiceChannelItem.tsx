import { useParticipants } from '@livekit/components-react'
import type { ChannelDto } from '@radcord/shared'
import { voiceSession } from '../../lib/voice/voiceSession'
import { useNavigationStore } from '../../stores/navigationStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { ParticipantRow } from '../voice/ParticipantRow'

function ConnectedParticipants(): React.JSX.Element {
  const participants = useParticipants()
  return (
    <ul className="voice-participants">
      {participants.map((participant) => (
        <ParticipantRow key={participant.identity} participant={participant} />
      ))}
    </ul>
  )
}

export function VoiceChannelItem({ channel }: { channel: ChannelDto }): React.JSX.Element {
  const api = useSessionStore((store) => store.session?.api)
  const connectedHere = useVoiceStore((store) => store.connection?.channelId === channel.id)
  const viewing = useNavigationStore((store) => store.view.kind === 'voice' && store.view.channelId === channel.id)

  function joinChannel(): void {
    useNavigationStore.getState().openVoiceChannel(channel.id)
    if (api) void voiceSession.join(api, channel.id)
  }

  return (
    <li>
      <button className={viewing || connectedHere ? 'channel-item channel-item--active' : 'channel-item'} onClick={joinChannel}>
        <span className="channel-item__icon">🔊</span>
        {channel.name}
      </button>
      {connectedHere && <ConnectedParticipants />}
    </li>
  )
}
