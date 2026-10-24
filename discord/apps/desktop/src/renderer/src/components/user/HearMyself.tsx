import { useEffect, useState } from 'react'
import { reportAppError } from '../../lib/report/reportAppError'
import { EarClosed, EarFailure } from '../../lib/voice/earStatus'
import { startServerEar, unlockEarOutput } from '../../lib/voice/serverEar'
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
          if (!hearing) unlockEarOutput()
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
  if (hearing) return 'Você está se ouvindo pelo servidor. O eco fica pausado. Fale acima do traço da sensibilidade: abaixo dele o retorno também fica mudo.'
  return 'O som da sua voz volta pelo servidor para você conferir como os outros escutam. O portão de sensibilidade vale para esse retorno.'
}

function listenToSelf(setError: (message: string) => void, stopHearing: () => void): () => void {
  const connection = useVoiceStore.getState().connection
  const session = useSessionStore.getState().session
  if (!connection || !session) {
    stopHearing()
    return () => {}
  }
  if (!isMicrophoneLive(useVoiceStore.getState())) {
    failEar(false, new Error('O microfone está mutado. Ligue ele para se ouvir.'), setError, stopHearing)
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
  const abort = new AbortController()
  void openEar(channelId, session, () => latch.stopped, abort.signal).then(
    (stop) => keepEar(latch, stop),
    (error: unknown) => failEar(latch.stopped, error, setError, stopHearing),
  )
  return () => {
    latch.stopped = true
    abort.abort()
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
  if (stopped || error instanceof EarClosed) return
  const message = error instanceof Error ? error.message : String(error)
  setError(message)
  reportAppError(`Escuta da própria voz: ${message}`, error instanceof EarFailure ? error.detail : undefined)
  stopHearing()
}

async function openEar(
  channelId: string,
  session: AuthSession,
  isStopped: () => boolean,
  signal: AbortSignal,
): Promise<() => void> {
  try {
    const stopEar = await connectEar(channelId, session, signal)
    if (isStopped()) {
      stopEar()
      return restoreMonitor
    }
    return () => stopBoth(stopEar)
  } catch (error) {
    await restoreMonitor()
    throw error
  }
}

async function connectEar(channelId: string, session: AuthSession, signal: AbortSignal): Promise<() => void> {
  await voiceSession.setSelfMonitor(true)
  const issued = await session.api.requestVoiceToken(channelId, true)
  return startServerEar(issued.livekitUrl, issued.token, session.user.id, signal)
}

function stopBoth(stopEar: () => void): void {
  stopEar()
  void restoreMonitor()
}

function restoreMonitor(): Promise<void> {
  return voiceSession.setSelfMonitor(false)
}
