import type { ChannelDto } from '@radcord/shared'
import { useNavigationStore } from '../../stores/navigationStore'

export function TextChannelItem({ channel }: { channel: ChannelDto }): React.JSX.Element {
  const active = useNavigationStore((store) => store.view.kind === 'text' && store.view.channelId === channel.id)

  return (
    <li>
      <button
        className={active ? 'channel-item channel-item--active' : 'channel-item'}
        onClick={() => useNavigationStore.getState().openTextChannel(channel.id)}
      >
        <span className="channel-item__icon">#</span>
        {channel.name}
      </button>
    </li>
  )
}
