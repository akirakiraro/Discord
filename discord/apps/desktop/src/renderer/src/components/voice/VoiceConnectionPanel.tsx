import { lazy, Suspense } from 'react'
import { useConnectionState } from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import { useHostPing } from '../../hooks/useHostPing'
import { classifyPing } from '../../lib/pingQuality'
import { voiceSession } from '../../lib/voice/voiceSession'
import { useChatStore } from '../../stores/chatStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { CallAudioProbe } from './CallAudioProbe'

// Área de testes: só no `npm run desktop`. No instalador vira `null` e o arquivo nem entra no pacote.
const DevBotsToggle = import.meta.env.DEV ? lazy(() => import('../dev/DevBotsPanel')) : null

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  [ConnectionState.Connected]: 'Voz conectada',
  [ConnectionState.Connecting]: 'Conectando…',
  [ConnectionState.Reconnecting]: 'Reconectando…',
  [ConnectionState.SignalReconnecting]: 'Reconectando…',
  [ConnectionState.Disconnected]: 'Desconectado',
}

function ConnectedStatus({ channelId }: { channelId: string }): React.JSX.Element {
  const connectionState = useConnectionState()
  const username = useSessionStore((store) => store.session?.user.username ?? null)
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
      <div className="voice-status__actions">
        <CallAudioProbe username={username} inCall />
        {DevBotsToggle && (
          <Suspense fallback={null}>
            <DevBotsToggle channelId={channelId} />
          </Suspense>
        )}
        <button className="icon-button icon-button--danger" title="Sair da call" onClick={() => void voiceSession.leave()}>
          📞
        </button>
      </div>
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
