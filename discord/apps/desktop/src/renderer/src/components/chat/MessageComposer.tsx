import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { MESSAGE_MAX_LENGTH, type ChannelDto } from '@radcord/shared'
import { withMessageUpserted } from '../../lib/chat/chatState'
import { readChatImage } from '../../lib/chat/chatImage'
import { shouldNotifyTyping } from '../../lib/chat/typingThrottle'
import { useChatStore } from '../../stores/chatStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useRealtimeSocket } from '../RealtimeContext'

export function MessageComposer({ channel }: { channel: ChannelDto }): React.JSX.Element {
  const api = useSessionStore((store) => store.session?.api)
  const socket = useRealtimeSocket()
  const [draft, setDraft] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastTypingSentAt = useRef<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function notifyTyping(): void {
    if (!socket || !shouldNotifyTyping(lastTypingSentAt.current, Date.now())) return
    lastTypingSentAt.current = Date.now()
    socket.emit('typing:start', { channelId: channel.id })
  }

  async function attach(file: File | undefined): Promise<void> {
    if (!file) return
    try {
      setImageUrl(await readChatImage(file))
      setError(null)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    }
  }

  async function send(): Promise<void> {
    const content = draft.trim()
    if (!api || (!content && !imageUrl)) return
    setDraft('')
    const pendingImage = imageUrl
    setImageUrl(null)
    lastTypingSentAt.current = null
    try {
      const message = await api.sendMessage(channel.id, content, pendingImage)
      useChatStore.getState().applyChat((state) => withMessageUpserted(state, message))
    } catch (failure) {
      setDraft(content)
      setImageUrl(pendingImage)
      setError(failure instanceof Error ? failure.message : String(failure))
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    void send()
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>): void {
    const file = event.clipboardData.files[0]
    if (!file?.type.startsWith('image/')) return
    event.preventDefault()
    void attach(file)
  }

  return (
    <div className="composer">
      {error && <p className="composer__error">{error}</p>}
      {imageUrl && (
        <div className="composer__preview">
          <img src={imageUrl} alt="Print para enviar" />
          <button type="button" className="link-button" onClick={() => setImageUrl(null)}>
            Remover
          </button>
        </div>
      )}
      <div className="composer__row">
        <button type="button" className="composer__attach" title="Anexar print" onClick={() => fileInput.current?.click()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z" />
          </svg>
        </button>
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
          onPaste={handlePaste}
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => {
            void attach(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
