/**
 * O que o bot conta para quem o abriu, uma linha JSON por evento no stdout.
 * O app de desenvolvimento lê isto; no terminal dá para ler direto.
 */
export type BotEvent =
  | { event: 'joined'; identity: string; displayName: string; channel: string }
  | { event: 'playing'; what: string; loop: boolean }
  | { event: 'idle' }
  | { event: 'error'; message: string }
  | { event: 'left' }

/** Exemplo: `emit({ event: 'idle' })` escreve `{"event":"idle"}`. */
export function formatEvent(event: BotEvent): string {
  return JSON.stringify(event)
}
