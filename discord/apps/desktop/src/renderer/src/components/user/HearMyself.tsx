import { useEffect, useState } from 'react'
import { startServerEar } from '../../lib/voice/serverEar'
import { voiceSession } from '../../lib/voice/voiceSession'
import { useSessionStore, type AuthSession } from '../../stores/sessionStore'
import { isMicrophoneLive, useVoiceStore } from '../../stores/voiceStore'

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
  if (hearing) return 'Você está se ouvindo pelo servidor. O cancelamento de eco fica pausado enquanto isso.'
  return 'O som da sua voz volta pelo servidor para você conferir como os outros escutam.'
}

function listenToSelf(setError: (message: string) => void, stopHearing: () => void): () => void {
  const connection = useVoiceStore.getState().connection
  const session = useSessionStore.getState().session
  if (!connection || !session) {
    stopHearing()
    return () => {}
  }
  if (!isMicrophoneLive(useVoiceStore.getState())) {
    setError('O microfone está mutado. Ligue ele para se ouvir.')
    stopHearing()
    return () => {}
  }
  return followEar(connection.channelId, session, setError, stopHearing)
}

function followEar(
  channelId: string,
  session: AuthSession,
  setError: (message: string) => void,
  stopHearing: () => void,
): () => void {
  const latch = { stopped: false, close: () => {} }
  void openEar(channelId, session, () => latch.stopped).then(
    (stop) => keepEar(latch, stop),
    (error: unknown) => failEar(latch.stopped, error, setError, stopHearing),
  )
  return () => {
    latch.stopped = true
    latch.close()
  }
}

function keepEar(latch: { stopped: boolean; close: () => void }, stop: () => void): void {
  if (latch.stopped) stop()
  else latch.close = stop
}

function failEar(
  stopped: boolean,
  error: unknown,
  setError: (message: string) => void,
  stopHearing: () => void,
): void {
  if (stopped) return
  setError(error instanceof Error ? error.message : String(error))
  stopHearing()
}

async function openEar(channelId: string, session: AuthSession, isStopped: () => boolean): Promise<() => void> {
  try {
    await voiceSession.setSelfMonitor(true)
    const { token, livekitUrl } = await session.api.requestVoiceToken(channelId, true)
    const stopEar = await startServerEar(livekitUrl, token, session.user.id)
    if (isStopped()) {
      stopEar()
      return restoreMonitor
    }
    return () => {
      stopEar()
      void restoreMonitor()
    }
  } catch (error) {
    await restoreMonitor()
    throw error
  }
}

function restoreMonitor(): Promise<void> {
  return voiceSession.setSelfMonitor(false)
}
