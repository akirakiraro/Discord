import { useEffect } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useNavigationStore } from '../stores/navigationStore'

/** Ao abrir o app (ou se o canal aberto sumir), mostra o primeiro canal de texto. */
export function useOpenFirstTextChannel(): void {
  const channels = useChatStore((store) => store.chat.channels)
  const view = useNavigationStore((store) => store.view)

  useEffect(() => {
    const viewedExists = view.kind !== 'none' && channels.some((channel) => channel.id === view.channelId)
    if (viewedExists) return
    const firstText = channels.find((channel) => channel.kind === 'text')
    if (firstText) useNavigationStore.getState().openTextChannel(firstText.id)
  }, [channels, view])
}
