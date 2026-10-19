import { useState, type FormEvent } from 'react'
import { loadSavedConnection, saveConnection, type SavedConnection } from '../lib/savedConnection'
import { openVoiceSession, type VoiceSession } from '../lib/voiceSession'

interface ConnectScreenProps {
  initialError: string | null
  onConnected: (session: VoiceSession) => void
}

export function ConnectScreen({ initialError, onConnected }: ConnectScreenProps): React.JSX.Element {
  const [form, setForm] = useState<SavedConnection>(() => loadSavedConnection(window.localStorage))
  const [error, setError] = useState<string | null>(initialError)
  const [connecting, setConnecting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setConnecting(true)
    setError(null)
    try {
      const session = await openVoiceSession(form)
      saveConnection(window.localStorage, form)
      onConnected(session)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
      setConnecting(false)
    }
  }

  return (
    <div className="connect-screen">
      <form className="connect-card" onSubmit={(event) => void handleSubmit(event)}>
        <h1>Radcord</h1>
        <p className="connect-card__subtitle">Entre na call da galera pela rede do Radmin</p>
        <ConnectFields form={form} onChange={setForm} />
        {error && <p className="connect-card__error">{error}</p>}
        <button type="submit" className="button button--primary" disabled={connecting}>
          {connecting ? 'Conectando…' : 'Entrar na call'}
        </button>
      </form>
    </div>
  )
}

interface ConnectFieldsProps {
  form: SavedConnection
  onChange: (form: SavedConnection) => void
}

function ConnectFields({ form, onChange }: ConnectFieldsProps): React.JSX.Element {
  return (
    <>
      <label className="field">
        <span>IP do host no Radmin</span>
        <input
          required
          placeholder="26.186.21.58"
          value={form.hostAddress}
          onChange={(event) => onChange({ ...form, hostAddress: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Seu apelido</span>
        <input
          required
          maxLength={32}
          placeholder="Akira"
          value={form.displayName}
          onChange={(event) => onChange({ ...form, displayName: event.target.value })}
        />
      </label>
    </>
  )
}
