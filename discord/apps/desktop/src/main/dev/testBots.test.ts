import { describe, expect, it } from 'vitest'
import type { DevBotView } from '../../shared/devBots'
import { parseBotEvent, TestBotManager, type BotProcess } from './testBots'

class FakeBot implements BotProcess {
  readonly written: string[] = []
  killed = false
  private stdout: (line: string) => void = () => undefined
  private stderr: (line: string) => void = () => undefined
  private exit: (code: number | null) => void = () => undefined

  write(line: string): void {
    this.written.push(line)
  }
  kill(): void {
    this.killed = true
  }
  onStdoutLine(listener: (line: string) => void): void {
    this.stdout = listener
  }
  onStderrLine(listener: (line: string) => void): void {
    this.stderr = listener
  }
  onExit(listener: (code: number | null) => void): void {
    this.exit = listener
  }
  say(line: string): void {
    this.stdout(line)
  }
  complain(line: string): void {
    this.stderr(line)
  }
  end(code: number | null): void {
    this.exit(code)
  }
}

function harness() {
  const spawned: Array<{ env: Record<string, string>; bot: FakeBot }> = []
  const published: DevBotView[][] = []
  const timers: Array<() => void> = []
  const manager = new TestBotManager(
    (env) => {
      const bot = new FakeBot()
      spawned.push({ env, bot })
      return bot
    },
    (bots) => published.push(bots),
    (run) => timers.push(run),
  )
  return { manager, spawned, published, timers }
}

const REQUEST = { apiUrl: 'http://26.1.2.3:3000', session: 'sess', channelId: 'canal-1' }

describe('bots de teste no processo principal', () => {
  it('cada bot ganha um número livre e recebe o pedido pelas variáveis', () => {
    const { manager, spawned } = harness()
    manager.add(REQUEST)
    manager.add(REQUEST)
    expect(spawned.map((entry) => entry.env)).toEqual([
      { RADCORD_BOT_API: 'http://26.1.2.3:3000', RADCORD_BOT_SESSION: 'sess', RADCORD_BOT_CHANNEL: 'canal-1', RADCORD_BOT_NUMBER: '1' },
      { RADCORD_BOT_API: 'http://26.1.2.3:3000', RADCORD_BOT_SESSION: 'sess', RADCORD_BOT_CHANNEL: 'canal-1', RADCORD_BOT_NUMBER: '2' },
    ])
    expect(manager.view().map((bot) => [bot.number, bot.phase])).toEqual([[1, 'starting'], [2, 'starting']])
  })

  it('os eventos do bot mudam a fase e logs que não são JSON são ignorados', () => {
    const { manager, spawned, published } = harness()
    manager.add(REQUEST)
    const bot = spawned[0]?.bot as FakeBot
    bot.say('livekit: conectando...')
    bot.say('{"event":"joined","identity":"dev-bot-1","displayName":"Bot de teste 1","channel":"Geral"}')
    bot.say('{"event":"playing","what":"sinal de teste","loop":true}')
    expect(manager.view()).toEqual([{ number: 1, name: 'Bot de teste 1', phase: 'playing', detail: 'sinal de teste' }])
    expect(published).toHaveLength(3)
  })

  it('as ações viram as linhas que o bot entende', () => {
    const { manager, spawned } = harness()
    manager.add(REQUEST)
    manager.act(1, { kind: 'tone' })
    manager.act(1, { kind: 'wav', path: 'C:/Sons/fala 1.wav' })
    manager.act(1, { kind: 'stop' })
    expect(spawned[0]?.bot.written).toEqual(['tom loop', 'wav loop C:/Sons/fala 1.wav', 'parar'])
    expect(manager.act(7, { kind: 'stop' }), 'bot inexistente não quebra').toHaveLength(1)
  })

  it('remover pede para sair e mata se o bot não fechar em 3 s', () => {
    const { manager, spawned, timers } = harness()
    manager.add(REQUEST)
    manager.act(1, { kind: 'remove' })
    const bot = spawned[0]?.bot as FakeBot
    expect(bot.written).toEqual(['sair'])
    expect(bot.killed).toBe(false)
    timers.forEach((run) => run())
    expect(bot.killed).toBe(true)
    expect(manager.view()).toEqual([])
  })

  it('saída normal some da lista; queda vira erro com a última linha do stderr', () => {
    const { manager, spawned } = harness()
    manager.add(REQUEST)
    manager.add(REQUEST)
    spawned[0]?.bot.end(0)
    const second = spawned[1]?.bot as FakeBot
    second.complain('Error: connect ECONNREFUSED 26.1.2.3:7880')
    second.end(1)
    expect(manager.view()).toEqual([{ number: 2, name: 'Bot de teste 2', phase: 'error', detail: 'Error: connect ECONNREFUSED 26.1.2.3:7880' }])
    manager.act(2, { kind: 'remove' })
    expect(manager.view(), 'bot com erro sai da lista direto').toEqual([])
  })

  it('erro contado pelo bot fica com a mensagem dele, não com o código de saída', () => {
    const { manager, spawned } = harness()
    manager.add(REQUEST)
    const bot = spawned[0]?.bot as FakeBot
    bot.say('{"event":"error","message":"o host não tem a rota do bot. Ligue o host com RADCORD_DEV_TOOLS=1"}')
    bot.end(1)
    expect(manager.view()[0]?.detail).toMatch(/RADCORD_DEV_TOOLS=1/)
  })

  it('no máximo 9 bots, e fechar o app mata todos', () => {
    const { manager, spawned } = harness()
    for (let index = 0; index < 9; index += 1) manager.add(REQUEST)
    expect(() => manager.add(REQUEST)).toThrow(/já há 9 bots/)
    manager.killAll()
    expect(spawned.every((entry) => entry.bot.killed)).toBe(true)
    expect(manager.view()).toEqual([])
  })

  it('evento desconhecido não vira fase', () => {
    expect(parseBotEvent('{"event":"outro"}')).toBeNull()
    expect(parseBotEvent('[1,2]')).toBeNull()
    expect(parseBotEvent('{"event":"idle"}')).toEqual({ phase: 'idle', detail: '' })
  })
})
