import { useState, type KeyboardEvent } from 'react'
import { MESSAGE_MAX_LENGTH, type MessageDto } from '@radcord/shared'
import { useSessionStore } from '../../stores/sessionStore'

interface MessageEditorProps {
  message: MessageDto
  onDone: () => void
}

export function MessageEditor({ message, onDone }: MessageEditorProps): React.JSX.Element {
  const api = useSessionStore((store) => store.session?.api)
  const [draft, setDraft] = useState(message.content)
  const [error, setError] = useState<string | null>(null)

  async function save(): Promise<void> {
    const content = draft.trim()
    if (!api || content === message.content) return onDone()
    try {
      await api.editMessage(message.id, content)
      onDone()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Escape') onDone()
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void save()
    }
  }

  return (
    <div className="message-editor">
      <textarea autoFocus maxLength={MESSAGE_MAX_LENGTH} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} />
      <small>Esc para cancelar · Enter para salvar</small>
      {error && <p className="message-editor__error">{error}</p>}
    </div>
  )
}
