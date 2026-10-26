import { useEffect, useState, type FormEvent } from 'react'
import { PRODUCT_DISPLAY_NAME } from '../../../../shared/appIdentity'
import { authenticate } from '../../lib/auth/authenticate'
import { loadSavedLogin, saveLogin } from '../../lib/savedLogin'
import { useSessionStore } from '../../stores/sessionStore'
import { useHostPower } from '../../hooks/useHostPower'
import { AuthFields } from './AuthFields'
import { HostAddressControl } from './HostAddressControl'
import { HostLaunchControl } from './HostLaunchControl'

export function AuthScreen(): React.JSX.Element {
  const signOutReason = useSessionStore((store) => store.signOutReason)
  const [username, setUsername] = useState(() => loadSavedLogin(window.localStorage).username)
  const [hostAddress, setHostAddress] = useState(() => loadSavedLogin(window.localStorage).hostAddress)
  const [error, setError] = useState<string | null>(signOutReason)
  const [submitting, setSubmitting] = useState(false)
  const host = useHostPower()

  useEffect(() => {
    if (hostAddress) return
    void window.radcord?.radminIp().then((ip) => {
      if (ip) setHostAddress(ip)
    })
  }, [hostAddress])

  function applyHostAddress(ip: string): void {
    const saved = loadSavedLogin(window.localStorage)
    saveLogin(window.localStorage, { ...saved, hostAddress: ip })
    setHostAddress(ip)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!hostAddress.trim()) {
      setError('Defina o IP do host no canto inferior esquerdo.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const session = await authenticate(hostAddress, username)
      saveLogin(window.localStorage, { hostAddress, username: session.user.username, token: session.token })
      useSessionStore.getState().signIn(session)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={(event) => void handleSubmit(event)}>
        <h1>Entrar no {PRODUCT_DISPLAY_NAME}</h1>
        <p className="auth-card__subtitle">{PRODUCT_DISPLAY_NAME} · a call da galera pela rede do Radmin</p>
        <AuthFields username={username} onChange={setUsername} />
        {error && <p className="auth-card__error">{error}</p>}
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? 'Conectando…' : 'Entrar'}
        </button>
      </form>
      <HostAddressControl value={hostAddress} onChange={setHostAddress} />
      <HostLaunchControl snapshot={host} onStart={() => void window.radcord?.hostStart()} onUseAddress={applyHostAddress} />
    </div>
  )
}
