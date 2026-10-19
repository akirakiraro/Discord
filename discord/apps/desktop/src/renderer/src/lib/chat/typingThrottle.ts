// Menor que o TTL do indicador (6 s) para ele não piscar enquanto a pessoa digita sem parar.
export const TYPING_NOTIFY_INTERVAL_MS = 3000

/**
 * Exemplo: `if (shouldNotifyTyping(lastSentAt, Date.now())) socket.emit('typing:start', { channelId })`
 */
export function shouldNotifyTyping(lastSentMs: number | null, nowMs: number): boolean {
  return lastSentMs === null || nowMs - lastSentMs >= TYPING_NOTIFY_INTERVAL_MS
}
