import type { ChannelDto } from '@radcord/shared'
import { MemberListToggle } from '../members/MemberListToggle'
import { MessageComposer } from './MessageComposer'
import { MessageList } from './MessageList'
import { TypingIndicator } from './TypingIndicator'

export function TextChannelView({ channel }: { channel: ChannelDto }): React.JSX.Element {
  return (
    <main className="main-panel text-channel">
      <header className="panel-header">
        <span className="panel-header__icon">#</span>
        <span className="panel-header__title">{channel.name}</span>
        <MemberListToggle />
      </header>
      <MessageList channel={channel} />
      <div className="text-channel__footer">
        <MessageComposer channel={channel} />
        <TypingIndicator channelId={channel.id} />
      </div>
    </main>
  )
}
