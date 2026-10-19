import { useConnectionState, useLocalParticipant, useRoomContext } from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import { Avatar } from './Avatar'
import { useHostPing } from '../hooks/useHostPing'
import { classifyPing } from '../lib/pingQuality'
import type { VoiceSession } from '../lib/voiceSession'

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  [ConnectionState.Connected]: 'Voz conectada',
  [ConnectionState.Connecting]: 'Conectando…',
  [ConnectionState.Reconnecting]: 'Reconectando…',
  [ConnectionState.SignalReconnecting]: 'Reconectando…',
  [ConnectionState.Disconnected]: 'Desconectado',
}

interface UserPanelProps {
  session: VoiceSession
  deafened: boolean
  onToggleDeafen: () => void
}

export function UserPanel({ session, deafened, onToggleDeafen }: UserPanelProps): React.JSX.Element {
  return (
    <div className="user-panel">
      <VoiceStatus session={session} />
      <div className="user-panel__me">
        <Avatar name={session.displayName} seed={session.displayName} />
        <span className="user-panel__name">{session.displayName}</span>
        <MicAndDeafenButtons deafened={deafened} onToggleDeafen={onToggleDeafen} />
      </div>
    </div>
  )
}

function VoiceStatus({ session }: { session: VoiceSession }): React.JSX.Element {
  const connectionState = useConnectionState()
  const pingMs = useHostPing(session.hostBaseUrl)
  const room = useRoomContext()

  return (
    <div className="voice-status">
      <div>
        <p className={`voice-status__state ping--${classifyPing(pingMs)}`}>{CONNECTION_LABEL[connectionState]}</p>
        <p className="voice-status__detail">
          {session.roomName} · {pingMs === null ? 'host sem resposta' : `${pingMs} ms`}
        </p>
      </div>
      <button className="icon-button icon-button--danger" title="Sair da call" onClick={() => void room.disconnect()}>
        📞
      </button>
    </div>
  )
}

interface MicAndDeafenButtonsProps {
  deafened: boolean
  onToggleDeafen: () => void
}

function MicAndDeafenButtons({ deafened, onToggleDeafen }: MicAndDeafenButtonsProps): React.JSX.Element {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()

  return (
    <div className="user-panel__buttons">
      <button
        className={isMicrophoneEnabled ? 'icon-button' : 'icon-button icon-button--off'}
        title={isMicrophoneEnabled ? 'Mutar microfone' : 'Desmutar microfone'}
        onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
      >
        {isMicrophoneEnabled ? '🎙️' : '🔇'}
      </button>
      <button
        className={deafened ? 'icon-button icon-button--off' : 'icon-button'}
        title={deafened ? 'Voltar a ouvir' : 'Ensurdecer'}
        onClick={onToggleDeafen}
      >
        {deafened ? '🔕' : '🎧'}
      </button>
    </div>
  )
}
