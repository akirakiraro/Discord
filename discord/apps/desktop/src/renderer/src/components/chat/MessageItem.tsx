import { useState } from 'react'
import type { MessageDto } from '@radcord/shared'
import { formatMessageTimestamp, formatShortTime } from '../../lib/chat/formatTimestamp'
import { useChatStore } from '../../stores/chatStore'
import { useSessionStore } from '../../stores/sessionStore'
import { Avatar } from '../common/Avatar'
import { MessageContent } from './MessageContent'
import { MessageEditor } from './MessageEditor'

interface MessageItemProps {
  message: MessageDto
  compact: boolean
}

export function MessageItem({ message, compact }: MessageItemProps): React.JSX.Element {
  const author = useChatStore((store) => store.chat.members[message.authorId])
  const session = useSessionStore((store) => store.session)
  const [editing, setEditing] = useState(false)
  const authorName = author?.displayName ?? 'Usuário removido'
  const isOwn = session?.user.id === message.authorId

  async function deleteMessage(): Promise<void> {
    if (!session || !window.confirm('Apagar esta mensagem?')) return
    await session.api.deleteMessage(message.id).catch((error: unknown) => window.alert(String(error)))
  }

  return (
    <article className={compact ? 'message message--compact' : 'message'}>
      <div className="message__gutter">
        {compact ? (
          <time className="message__short-time">{formatShortTime(message.createdAt)}</time>
        ) : (
          <Avatar name={authorName} seed={message.authorId} size={40} />
        )}
      </div>
      <div className="message__body">
        {!compact && (
          <header className="message__header">
            <span className="message__author">{authorName}</span>
            <time className="message__time">{formatMessageTimestamp(message.createdAt, new Date())}</time>
          </header>
        )}
        {editing ? <MessageEditor message={message} onDone={() => setEditing(false)} /> : <MessageContent message={message} />}
      </div>
      {isOwn && !editing && (
        <div className="message__actions">
          <button title="Editar" onClick={() => setEditing(true)}>✏️</button>
          <button title="Apagar" onClick={() => void deleteMessage()}>🗑️</button>
        </div>
      )}
    </article>
  )
}
