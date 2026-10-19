import { useConnectionState } from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import { useHostPing } from '../../hooks/useHostPing'
import { classifyPing } from '../../lib/pingQuality'
import { voiceSession } from '../../lib/voice/voiceSession'
import { useChatStore } from '../../stores/chatStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  [ConnectionState.Connected]: 'Voz conectada',
  [ConnectionState.Connecting]: 'Conectando…',
  [ConnectionState.Reconnecting]: 'Reconectando…',
  [ConnectionState.SignalReconnecting]: 'Reconectando…',
  [ConnectionState.Disconnected]: 'Desconectado',
}

function ConnectedStatus({ channelId }: { channelId: string }): React.JSX.Element {
  const connectionState = useConnectionState()
  const hostBaseUrl = useSessionStore((store) => store.session?.api.baseUrl ?? '')
  const pingMs = useHostPing(hostBaseUrl)
  const channelName = useChatStore((store) => store.chat.channels.find((channel) => channel.id === channelId)?.name)

  return (
    <div className="voice-status">
      <div>
        <p className={`voice-status__state ping--${classifyPing(pingMs)}`}>{CONNECTION_LABEL[connectionState]}</p>
        <p className="voice-status__detail">
          {channelName ?? 'canal'} · {pingMs === null ? 'host sem resposta' : `${pingMs} ms`}
        </p>
      </div>
      <button className="icon-button icon-button--danger" title="Sair da call" onClick={() => void voiceSession.leave()}>
        📞
      </button>
    </div>
  )
}

export function VoiceConnectionPanel(): React.JSX.Element | null {
  const connection = useVoiceStore((store) => store.connection)
  const lastError = useVoiceStore((store) => store.lastError)

  if (connection) return <ConnectedStatus channelId={connection.channelId} />
  if (!lastError) return null
  return (
    <div className="voice-status voice-status--error">
      <p>{lastError}</p>
      <button className="icon-button" title="Fechar" onClick={() => useVoiceStore.setState({ lastError: null })}>
        ✕
      </button>
    </div>
  )
}
