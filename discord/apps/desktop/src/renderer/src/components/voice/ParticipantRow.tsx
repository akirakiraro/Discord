import { useConnectionQualityIndicator } from '@livekit/components-react'
import { ConnectionQuality, type Participant } from 'livekit-client'
import { Avatar } from '../common/Avatar'
import { ListenerVolumeToggle } from './ListenerVolumeToggle'
import { useMemberFace } from './useMemberFace'
import { useSpeaking } from './useSpeaking'

const QUALITY_LABEL: Record<ConnectionQuality, string> = {
  [ConnectionQuality.Excellent]: 'Conexão excelente',
  [ConnectionQuality.Good]: 'Conexão boa',
  [ConnectionQuality.Poor]: 'Conexão ruim',
  [ConnectionQuality.Lost]: 'Conexão perdida',
  [ConnectionQuality.Unknown]: 'Medindo conexão…',
}

export function ParticipantRow({ participant }: { participant: Participant }): React.JSX.Element {
  const speaking = useSpeaking(participant)
  const { quality } = useConnectionQualityIndicator({ participant })
  const face = useMemberFace(participant.identity, participant.name || participant.identity)

  return (
    <li className="participant-row" title={QUALITY_LABEL[quality]}>
      <ListenerVolumeToggle userId={participant.identity} name={face.name}>
        <Avatar name={face.name} seed={participant.identity} imageUrl={face.imageUrl} speaking={speaking} size={24} />
        <span className="participant-row__name">{face.name}</span>
        {participant.isScreenShareEnabled && <span className="badge badge--live">AO VIVO</span>}
        {!participant.isMicrophoneEnabled && <span className="participant-row__muted">🔇</span>}
        <span className={`quality-dot quality-dot--${quality}`} />
      </ListenerVolumeToggle>
    </li>
  )
}
