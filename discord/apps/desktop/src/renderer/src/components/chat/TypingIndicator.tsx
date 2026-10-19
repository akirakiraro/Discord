import { useNow } from '../../hooks/useNow'
import { activeTypistIds, describeTypists } from '../../lib/chat/typingState'
import { useChatStore } from '../../stores/chatStore'
import { useSessionStore } from '../../stores/sessionStore'

export function TypingIndicator({ channelId }: { channelId: string }): React.JSX.Element {
  const nowMs = useNow(1000)
  const typing = useChatStore((store) => store.typing)
  const members = useChatStore((store) => store.chat.members)
  const selfId = useSessionStore((store) => store.session?.user.id)
  const names = activeTypistIds(typing, channelId, nowMs)
    .filter((userId) => userId !== selfId)
    .map((userId) => members[userId]?.displayName ?? 'Alguém')

  return <div className="typing-indicator">{describeTypists(names)}</div>
}
