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
          +
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
        <div className="composer__tools" aria-hidden="true">
          <span className="composer__tool" title="Presente">
            <GiftIcon />
          </span>
          <span className="composer__tool composer__tool--gif">GIF</span>
          <span className="composer__tool" title="Figurinha">
            <StickerIcon />
          </span>
          <span className="composer__tool" title="Emoji">
            <EmojiIcon />
          </span>
          <span className="composer__tool" title="Aplicativos">
            <AppsIcon />
          </span>
        </div>
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

function GiftIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 7.2c.7-1.6 1.8-3.2 3.6-3.2 1.5 0 2.4 1.1 2.4 2.3 0 1.8-1.6 2.9-3.4 2.9H12V7.2zm0 0c-.7-1.6-1.8-3.2-3.6-3.2C6.9 4 6 5.1 6 6.3c0 1.8 1.6 2.9 3.4 2.9H12V7.2zM5 11h14v8.2A1.8 1.8 0 0 1 17.2 21H6.8A1.8 1.8 0 0 1 5 19.2V11zm6 0v10h2V11h-2zM4 9.2A1.2 1.2 0 0 1 5.2 8h13.6A1.2 1.2 0 0 1 20 9.2V11H4V9.2z" />
    </svg>
  )
}

function StickerIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h9.2L20 9.8V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm8 1.5V10h4.5L13 5.5zM8.2 13.2a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zm6.2 0a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zM8 16.2c.7.8 1.8 1.3 3.3 1.3s2.6-.5 3.3-1.3l1.1.8c-.9 1.2-2.5 1.9-4.4 1.9s-3.5-.7-4.4-1.9l1.1-.8z" />
    </svg>
  )
}

function EmojiIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-3.2 7.1a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zm6.4 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM12 17.2c1.8 0 3.2-.9 4-2.2l-1.2-.7c-.5.8-1.4 1.3-2.8 1.3s-2.3-.5-2.8-1.3l-1.2.7c.8 1.3 2.2 2.2 4 2.2z" />
    </svg>
  )
}

function AppsIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.2 14.2 8 19.4 9l-3.8 3.4.9 4.8L12 15.2 7.5 17.2l.9-4.8L4.6 9 9.8 8 12 3.2z" />
    </svg>
  )
}
