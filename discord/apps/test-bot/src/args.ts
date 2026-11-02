export interface BotArgs {
  apiUrl: string
  session: string
  channel: string
  botNumber: number
  /** Tocar logo ao entrar: `tom`, um caminho de WAV, ou nada. */
  play: string | null
}

/**
 * Lê os argumentos do terminal, com fallback nas variáveis `RADCORD_BOT_*` que o app usa.
 * Exemplo: `parseBotArgs(['--api', 'http://26.1.2.3:3000', '--sessao', 'abc', '--canal', 'Geral'], {})`
 */
export function parseBotArgs(argv: readonly string[], env: Readonly<Record<string, string | undefined>>): BotArgs {
  const flags = readFlags(argv)
  const apiUrl = (flags.api ?? env.RADCORD_BOT_API ?? '').replace(/\/+$/, '')
  const session = flags.sessao ?? env.RADCORD_BOT_SESSION ?? ''
  const channel = flags.canal ?? env.RADCORD_BOT_CHANNEL ?? ''
  const botNumber = Number(flags.numero ?? env.RADCORD_BOT_NUMBER ?? '1')
  if (!/^https?:\/\/.+/.test(apiUrl)) throw new Error(`--api inválido: ${JSON.stringify(apiUrl)}; esperado http://IP:3000`)
  if (!session) throw new Error('--sessao ausente; esperado o token de sessão de quem está logado')
  if (!channel) throw new Error('--canal ausente; esperado o id ou o nome do canal de voz')
  if (!Number.isInteger(botNumber) || botNumber < 1 || botNumber > 99) {
    throw new Error(`--numero ${JSON.stringify(flags.numero)} inválido; esperado inteiro de 1 a 99`)
  }
  return { apiUrl, session, channel, botNumber, play: flags.tocar ?? env.RADCORD_BOT_PLAY ?? null }
}

function readFlags(argv: readonly string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index]
    if (!name?.startsWith('--')) continue
    const value = argv[index + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`${name} sem valor`)
    flags[name.slice(2)] = value
    index += 1
  }
  return flags
}
