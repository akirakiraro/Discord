import { useRef, useState, type KeyboardEvent } from 'react'
import { MESSAGE_MAX_LENGTH, type ChannelDto } from '@radcord/shared'
import { withMessageUpserted } from '../../lib/chat/chatState'
import { shouldNotifyTyping } from '../../lib/chat/typingThrottle'
import { useChatStore } from '../../stores/chatStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useRealtimeSocket } from '../RealtimeContext'

export function MessageComposer({ channel }: { channel: ChannelDto }): React.JSX.Element {
  const api = useSessionStore((store) => store.session?.api)
  const socket = useRealtimeSocket()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const lastTypingSentAt = useRef<number | null>(null)

  function notifyTyping(): void {
    if (!socket || !shouldNotifyTyping(lastTypingSentAt.current, Date.now())) return
    lastTypingSentAt.current = Date.now()
    socket.emit('typing:start', { channelId: channel.id })
  }

  async function send(): Promise<void> {
    const content = draft.trim()
    if (!api || !content) return
    setDraft('')
    lastTypingSentAt.current = null
    try {
      const message = await api.sendMessage(channel.id, content)
      useChatStore.getState().applyChat((state) => withMessageUpserted(state, message))
    } catch (failure) {
      setDraft(content)
      setError(failure instanceof Error ? failure.message : String(failure))
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    void send()
  }

  return (
    <div className="composer">
      {error && <p className="composer__error">{error}</p>}
      <textarea
        rows={1}
        maxLength={MESSAGE_MAX_LENGTH}
        placeholder={`Conversar em #${channel.name}`}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          setError(null)
          notifyTyping()
        }}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
