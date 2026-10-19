import { useState } from 'react'
import type { ChannelDto, ChannelKind } from '@radcord/shared'
import { CreateChannelForm } from './CreateChannelForm'
import { TextChannelItem } from './TextChannelItem'
import { VoiceChannelItem } from './VoiceChannelItem'

interface ChannelCategoryProps {
  kind: ChannelKind
  title: string
  channels: ChannelDto[]
}

export function ChannelCategory({ kind, title, channels }: ChannelCategoryProps): React.JSX.Element {
  const [creating, setCreating] = useState(false)

  return (
    <section className="channel-category">
      <header className="channel-category__header">
        <span>{title}</span>
        <button className="channel-category__add" title="Criar canal" onClick={() => setCreating(!creating)}>
          +
        </button>
      </header>
      {creating && <CreateChannelForm kind={kind} onDone={() => setCreating(false)} />}
      <ul className="channel-list">
        {channels.map((channel) =>
          kind === 'text' ? <TextChannelItem key={channel.id} channel={channel} /> : <VoiceChannelItem key={channel.id} channel={channel} />,
        )}
      </ul>
    </section>
  )
}
