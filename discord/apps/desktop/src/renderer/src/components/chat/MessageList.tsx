import type { ChannelDto } from '@radcord/shared'
import { useChannelHistory } from '../../hooks/useChannelHistory'
import { useStickToBottom } from '../../hooks/useStickToBottom'
import { isContinuation } from '../../lib/chat/messageGrouping'
import { MessageItem } from './MessageItem'

function ChannelWelcome({ name }: { name: string }): React.JSX.Element {
  return (
    <div className="channel-welcome">
      <div className="channel-welcome__icon">#</div>
      <h2>Boas-vindas a #{name}!</h2>
      <p>Este é o começo do canal #{name}.</p>
    </div>
  )
}

export function MessageList({ channel }: { channel: ChannelDto }): React.JSX.Element {
  const { messages, hasMore, loadingOlder, error, loadOlder } = useChannelHistory(channel.id)
  const listRef = useStickToBottom(messages)

  return (
    <div className="message-list" ref={listRef}>
      {hasMore ? (
        <button className="message-list__older" disabled={loadingOlder} onClick={loadOlder}>
          {loadingOlder ? 'Carregando…' : 'Carregar mensagens antigas'}
        </button>
      ) : (
        messages && <ChannelWelcome name={channel.name} />
      )}
      {error && <p className="message-list__error">{error}</p>}
      {!messages && !error && <p className="message-list__loading">Carregando mensagens…</p>}
      {messages?.map((message, index) => (
        <MessageItem key={message.id} message={message} compact={isContinuation(messages[index - 1], message)} />
      ))}
    </div>
  )
}
