import { useState, type FormEvent } from 'react'
import { authenticate, type AuthForm, type AuthMode } from '../../lib/auth/authenticate'
import { loadSavedLogin, saveLogin } from '../../lib/savedLogin'
import { useSessionStore } from '../../stores/sessionStore'
import { AuthFields } from './AuthFields'

const COPY: Record<AuthMode, { title: string; submit: string; switchPrompt: string; switchAction: string }> = {
  login: { title: 'Boas-vindas de volta!', submit: 'Entrar', switchPrompt: 'Primeira vez aqui?', switchAction: 'Criar conta' },
  register: { title: 'Criar uma conta', submit: 'Continuar', switchPrompt: 'Já tem conta?', switchAction: 'Entrar' },
}

function initialForm(): AuthForm {
  const saved = loadSavedLogin(window.localStorage)
  return { hostAddress: saved.hostAddress, username: saved.username, displayName: '', password: '' }
}

export function AuthScreen(): React.JSX.Element {
  const signOutReason = useSessionStore((store) => store.signOutReason)
  const [mode, setMode] = useState<AuthMode>(() => (loadSavedLogin(window.localStorage).username ? 'login' : 'register'))
  const [form, setForm] = useState<AuthForm>(initialForm)
  const [error, setError] = useState<string | null>(signOutReason)
  const [submitting, setSubmitting] = useState(false)
  const copy = COPY[mode]

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const session = await authenticate(form, mode)
      saveLogin(window.localStorage, { hostAddress: form.hostAddress, username: session.user.username, token: session.token })
      useSessionStore.getState().signIn(session)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={(event) => void handleSubmit(event)}>
        <h1>{copy.title}</h1>
        <p className="auth-card__subtitle">Radcord · a call da galera pela rede do Radmin</p>
        <AuthFields form={form} mode={mode} onChange={setForm} />
        {error && <p className="auth-card__error">{error}</p>}
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? 'Conectando…' : copy.submit}
        </button>
        <p className="auth-card__switch">
          {copy.switchPrompt}{' '}
          <button type="button" className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {copy.switchAction}
          </button>
        </p>
      </form>
    </div>
  )
}
