import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { MessageDto } from '@radcord/shared'

const NEAR_BOTTOM_PX = 120

/**
 * Rola para baixo quando chega mensagem nova (se o usuário já estava no fim) e mantém
 * a posição de leitura quando uma página antiga é inserida no topo.
 * Exemplo: `const listRef = useStickToBottom(messages)` e `<div ref={listRef}>`
 */
export function useStickToBottom(messages: MessageDto[] | undefined): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previous = useRef({ firstId: undefined as string | undefined, scrollHeight: 0, nearBottom: true })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !messages) return
    const firstId = messages[0]?.id
    const prependedOlder = previous.current.firstId !== undefined && firstId !== previous.current.firstId
    if (prependedOlder) container.scrollTop += container.scrollHeight - previous.current.scrollHeight
    else if (previous.current.nearBottom) container.scrollTop = container.scrollHeight
    previous.current = { firstId, scrollHeight: container.scrollHeight, nearBottom: previous.current.nearBottom }
  }, [messages])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const trackPosition = (): void => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight
      previous.current.nearBottom = distance < NEAR_BOTTOM_PX
      previous.current.scrollHeight = container.scrollHeight
    }
    container.addEventListener('scroll', trackPosition)
    return () => container.removeEventListener('scroll', trackPosition)
  }, [])

  return containerRef
}
