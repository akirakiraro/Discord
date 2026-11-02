import { botCommandLine, type DevBotAction, type DevBotAddRequest, type DevBotPhase, type DevBotView } from '../../shared/devBots'

export interface BotProcess {
  write(line: string): void
  kill(): void
  onStdoutLine(listener: (line: string) => void): void
  onStderrLine(listener: (line: string) => void): void
  onExit(listener: (code: number | null) => void): void
}

export type SpawnBot = (env: Record<string, string>) => BotProcess

const MAX_BOTS = 9
const QUIT_GRACE_MS = 3000

interface Running {
  view: DevBotView
  process: BotProcess
  lastError: string
}

/**
 * Abre, controla e fecha os bots de teste. Cada bot é um processo `node` do `apps/test-bot`.
 * Exemplo: `manager.add({ apiUrl, session, channelId })` e depois `manager.act(1, { kind: 'tone' })`.
 */
export class TestBotManager {
  private readonly bots = new Map<number, Running>()

  constructor(
    private readonly spawnBot: SpawnBot,
    private readonly publish: (bots: DevBotView[]) => void,
    private readonly later: (run: () => void, ms: number) => void = (run, ms) => void setTimeout(run, ms),
  ) {}

  view(): DevBotView[] {
    return [...this.bots.values()].map((bot) => bot.view).sort((left, right) => left.number - right.number)
  }

  add(request: DevBotAddRequest): DevBotView[] {
    const number = this.freeNumber()
    if (number === null) throw new Error(`já há ${MAX_BOTS} bots na call; remova um antes de adicionar outro`)
    const process = this.spawnBot({
      RADCORD_BOT_API: request.apiUrl,
      RADCORD_BOT_SESSION: request.session,
      RADCORD_BOT_CHANNEL: request.channelId,
      RADCORD_BOT_NUMBER: String(number),
    })
    const bot: Running = { view: { number, name: `Bot de teste ${number}`, phase: 'starting', detail: '' }, process, lastError: '' }
    this.bots.set(number, bot)
    process.onStdoutLine((line) => this.onEvent(number, line))
    process.onStderrLine((line) => {
      if (line.trim()) bot.lastError = line.trim()
    })
    process.onExit((code) => this.onExit(number, code))
    this.changed()
    return this.view()
  }

  act(number: number, action: DevBotAction): DevBotView[] {
    const bot = this.bots.get(number)
    if (!bot) return this.view()
    if (action.kind === 'remove' && (bot.view.phase === 'error' || bot.view.phase === 'left')) {
      this.bots.delete(number)
      this.changed()
      return this.view()
    }
    bot.process.write(botCommandLine(action))
    if (action.kind === 'remove') this.later(() => this.forceKill(number, bot), QUIT_GRACE_MS)
    return this.view()
  }

  /** Fechar o app derruba todos os bots. */
  killAll(): void {
    for (const bot of this.bots.values()) bot.process.kill()
    this.bots.clear()
  }

  private onEvent(number: number, line: string): void {
    const bot = this.bots.get(number)
    const event = parseBotEvent(line)
    if (!bot || !event) return
    const { name, ...rest } = event
    bot.view = { ...bot.view, ...rest, ...(name ? { name } : {}) }
    this.changed()
  }

  private onExit(number: number, code: number | null): void {
    const bot = this.bots.get(number)
    if (!bot) return
    if (code === 0 || bot.view.phase === 'left') {
      this.bots.delete(number)
    } else if (bot.view.phase !== 'error') {
      bot.view = { ...bot.view, phase: 'error', detail: bot.lastError || `o bot saiu com o código ${String(code)}` }
    }
    this.changed()
  }

  private forceKill(number: number, bot: Running): void {
    if (this.bots.get(number) !== bot) return
    bot.process.kill()
    this.bots.delete(number)
    this.changed()
  }

  private freeNumber(): number | null {
    for (let number = 1; number <= MAX_BOTS; number += 1) if (!this.bots.has(number)) return number
    return null
  }

  private changed(): void {
    this.publish(this.view())
  }
}

/**
 * Traduz uma linha JSON do bot. Linha que não é evento (log do LiveKit) é ignorada.
 * Exemplo: `parseBotEvent('{"event":"idle"}')` devolve `{ phase: 'idle', detail: '' }`.
 */
export function parseBotEvent(line: string): { phase: DevBotPhase; detail: string; name?: string } | null {
  let raw: unknown
  try {
    raw = JSON.parse(line)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null
  const event = raw as Record<string, unknown>
  switch (event.event) {
    case 'joined':
      return { phase: 'joined', detail: `canal ${String(event.channel ?? '')}`, name: String(event.displayName ?? '') || undefined }
    case 'playing':
      return { phase: 'playing', detail: String(event.what ?? '') }
    case 'idle':
      return { phase: 'idle', detail: '' }
    case 'error':
      return { phase: 'error', detail: String(event.message ?? 'erro sem mensagem') }
    case 'left':
      return { phase: 'left', detail: '' }
    default:
      return null
  }
}
