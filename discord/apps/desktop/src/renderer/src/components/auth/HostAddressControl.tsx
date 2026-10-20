import { useState, type FormEvent } from 'react'
import { loadSavedLogin, saveLogin } from '../../lib/savedLogin'

interface HostAddressControlProps {
  value: string
  onChange: (hostAddress: string) => void
}

/**
 * Botão no canto da tela de entrada para trocar o IP do host.
 * Exemplo: `<HostAddressControl value={host} onChange={setHost} />`
 */
export function HostAddressControl({ value, onChange }: HostAddressControlProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function confirm(event: FormEvent): void {
    event.preventDefault()
    const hostAddress = draft.trim()
    const saved = loadSavedLogin(window.localStorage)
    saveLogin(window.localStorage, { ...saved, hostAddress })
    onChange(hostAddress)
    setEditing(false)
  }

  if (editing) return <HostAddressForm draft={draft} onDraft={setDraft} onSubmit={confirm} />
  return (
    <button type="button" className="host-switch" onClick={() => openEditor(value, setDraft, setEditing)}>
      {value ? `Host ${value}` : 'Definir host'}
    </button>
  )
}

function openEditor(value: string, setDraft: (value: string) => void, setEditing: (editing: boolean) => void): void {
  setDraft(value)
  setEditing(true)
}

interface HostAddressFormProps {
  draft: string
  onDraft: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

function HostAddressForm({ draft, onDraft, onSubmit }: HostAddressFormProps): React.JSX.Element {
  return (
    <form className="host-switch" onSubmit={onSubmit}>
      <input autoFocus value={draft} placeholder="26.186.21.58" aria-label="IP do host" onChange={(event) => onDraft(event.target.value)} />
      <button type="submit">Salvar</button>
    </form>
  )
}
