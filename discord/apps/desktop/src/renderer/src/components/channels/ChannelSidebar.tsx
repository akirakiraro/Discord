import { PRODUCT_DISPLAY_NAME } from '../../../../shared/appIdentity'
import { useChatStore } from '../../stores/chatStore'
import { UserPanel } from '../user/UserPanel'
import { VoiceConnectionPanel } from '../voice/VoiceConnectionPanel'
import { ChannelCategory } from './ChannelCategory'

export function ChannelSidebar(): React.JSX.Element {
  const channels = useChatStore((store) => store.chat.channels)

  return (
    <aside className="channel-sidebar">
      <header className="channel-sidebar__header">{PRODUCT_DISPLAY_NAME}</header>
      <nav className="channel-sidebar__channels">
        <ChannelCategory kind="text" title="Canais de texto" channels={channels.filter((channel) => channel.kind === 'text')} />
        <ChannelCategory kind="voice" title="Canais de voz" channels={channels.filter((channel) => channel.kind === 'voice')} />
      </nav>
      <VoiceConnectionPanel />
      <UserPanel />
    </aside>
  )
}
