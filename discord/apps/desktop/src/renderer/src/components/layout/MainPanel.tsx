import { useChatStore } from '../../stores/chatStore'
import { useNavigationStore } from '../../stores/navigationStore'
import { TextChannelView } from '../chat/TextChannelView'
import { VoiceChannelView } from '../voice/VoiceChannelView'

export function MainPanel(): React.JSX.Element {
  const view = useNavigationStore((store) => store.view)
  const channel = useChatStore((store) =>
    view.kind === 'none' ? undefined : store.chat.channels.find((candidate) => candidate.id === view.channelId),
  )

  if (!channel) return <main className="main-panel main-panel--empty">Carregando canais…</main>
  if (channel.kind === 'voice') return <VoiceChannelView channel={channel} />
  return <TextChannelView key={channel.id} channel={channel} />
}
