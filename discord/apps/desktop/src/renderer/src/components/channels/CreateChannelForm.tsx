import { useState, type FormEvent } from 'react'
import type { ChannelKind } from '@radcord/shared'
import { withChannelAdded } from '../../lib/chat/chatState'
import { useChatStore } from '../../stores/chatStore'
import { useNavigationStore } from '../../stores/navigationStore'
import { useSessionStore } from '../../stores/sessionStore'

interface CreateChannelFormProps {
  kind: ChannelKind
  onDone: () => void
}

export function CreateChannelForm({ kind, onDone }: CreateChannelFormProps): React.JSX.Element {
  const api = useSessionStore((store) => store.session?.api)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!api) return
    try {
      const channel = await api.createChannel({ name, kind })
      useChatStore.getState().applyChat((state) => withChannelAdded(state, channel))
      if (kind === 'text') useNavigationStore.getState().openTextChannel(channel.id)
      onDone()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    }
  }

  return (
    <form className="create-channel" onSubmit={(event) => void handleSubmit(event)}>
      <input
        autoFocus
        placeholder={kind === 'text' ? 'novo-canal' : 'nova-call'}
        value={name}
        onChange={(event) => setName(event.target.value.toLowerCase().replace(/\s+/g, '-'))}
        onKeyDown={(event) => event.key === 'Escape' && onDone()}
      />
      {error && <p className="create-channel__error">{error}</p>}
    </form>
  )
}
