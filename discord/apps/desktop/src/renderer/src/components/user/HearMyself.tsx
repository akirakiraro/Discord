import { useEffect, useState } from 'react'
import { startServerEar } from '../../lib/voice/serverEar'
import { useSessionStore } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'

/**
 * Liga e desliga a escuta da própria voz depois que ela volta do servidor.
 * Exemplo: `<HearMyself />` na aba de voz das configurações.
 */
export function HearMyself(): React.JSX.Element {
  const channelId = useVoiceStore((store) => store.connection?.channelId ?? null)
  const [hearing, setHearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hearing) return undefined
    if (!channelId) {
      setHearing(false)
      return undefined
    }
    return listenToSelf(setError, () => setHearing(false))
  }, [hearing, channelId])

  return (
    <div className="settings-modal__field">
      <button
        type="button"
        className={hearing ? 'button button--success' : 'button button--primary'}
        disabled={!channelId && !hearing}
        onClick={() => {
          setError(null)
          setHearing((current) => !current)
        }}
      >
        {hearing ? 'Parar de me ouvir' : 'Me ouvir'}
      </button>
      <p className="settings-modal__hint">{hint(channelId !== null, hearing)}</p>
      {error && <p className="settings-modal__error">{error}</p>}
    </div>
  )
}

function hint(inCall: boolean, hearing: boolean): string {
  if (!inCall) return 'Entre num canal de voz. O som volta pelo servidor, com o atraso da chamada.'
  if (hearing) return 'Você está se ouvindo pelo servidor.'
  return 'O som da sua voz volta pelo servidor para você conferir como os outros escutam.'
}

function listenToSelf(setError: (message: string) => void, stopHearing: () => void): () => void {
  const connection = useVoiceStore.getState().connection
  const session = useSessionStore.getState().session
  if (!connection || !session) {
    stopHearing()
    return () => {}
  }
  let stopped = false
  let close = () => {}
  void session.api
    .requestVoiceToken(connection.channelId, true)
    .then(({ token, livekitUrl }) => startServerEar(livekitUrl, token, session.user.id))
    .then((stop) => {
      if (stopped) stop()
      else close = stop
    })
    .catch((error: unknown) => {
      if (stopped) return
      setError(error instanceof Error ? error.message : String(error))
      stopHearing()
    })
  return () => {
    stopped = true
    close()
  }
}
