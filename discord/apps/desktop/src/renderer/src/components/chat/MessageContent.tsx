import type { MessageDto } from '@radcord/shared'
import { splitLinks } from '../../lib/chat/linkify'

export function MessageContent({ message }: { message: MessageDto }): React.JSX.Element {
  return (
    <p className="message__content">
      {splitLinks(message.content).map((segment, index) =>
        segment.kind === 'link' ? (
          <a key={index} href={segment.value} target="_blank" rel="noreferrer">
            {segment.value}
          </a>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
      {message.editedAt && <span className="message__edited"> (editado)</span>}
    </p>
  )
}
