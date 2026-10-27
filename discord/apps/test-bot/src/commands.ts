export type BotCommand =
  | { kind: 'tone'; loop: boolean }
  | { kind: 'wav'; path: string; loop: boolean }
  | { kind: 'stop' }
  | { kind: 'quit' }

/**
 * Comandos por linha, no stdin. O app manda os mesmos; no terminal dá para digitar.
 * `tom`, `tom loop`, `wav C:\\fala.wav`, `wav loop C:\\fala.wav`, `parar`, `sair`.
 * Exemplo: `parseCommand('wav loop C:/a.wav')` devolve `{ kind: 'wav', path: 'C:/a.wav', loop: true }`.
 */
export function parseCommand(line: string): BotCommand | null {
  const trimmed = line.trim()
  const [word = '', ...rest] = trimmed.split(/\s+/)
  const loop = rest[0] === 'loop'
  const argument = trimmed.slice(word.length).trim().replace(/^loop\s+/, '').replace(/^"(.*)"$/, '$1')
  switch (word.toLowerCase()) {
    case 'tom':
      return { kind: 'tone', loop }
    case 'wav':
      return argument && argument !== 'loop' ? { kind: 'wav', path: argument, loop } : null
    case 'parar':
      return { kind: 'stop' }
    case 'sair':
      return { kind: 'quit' }
    default:
      return null
  }
}
