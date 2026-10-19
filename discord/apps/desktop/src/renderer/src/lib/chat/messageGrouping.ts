import type { MessageDto } from '@radcord/shared'

const GROUP_WINDOW_MS = 5 * 60 * 1000

/**
 * Discord junta mensagens seguidas do mesmo autor em até 5 minutos sob um único cabeçalho.
 * Exemplo: `const compact = isContinuation(messages[i - 1], messages[i])`
 */
export function isContinuation(previous: MessageDto | undefined, current: MessageDto): boolean {
  if (!previous || previous.authorId !== current.authorId) return false
  const gapMs = Date.parse(current.createdAt) - Date.parse(previous.createdAt)
  return gapMs >= 0 && gapMs < GROUP_WINDOW_MS
}
