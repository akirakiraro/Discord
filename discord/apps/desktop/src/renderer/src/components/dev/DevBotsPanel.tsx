import { useEffect, useState } from 'react'
import { devBotPhaseLabel, type DevBotAction, type DevBotView } from '../../../../shared/devBots'
import { useSessionStore } from '../../stores/sessionStore'
import { Button } from '../ui/Button'
import '../../styles/devBots.css'

/**
 * Área de testes: põe bots na call e faz eles tocarem áudio.
 * Só o `npm run desktop` carrega este arquivo (`import.meta.env.DEV` no VoiceConnectionPanel).
 * Exemplo: `<DevBotsToggle channelId={connection.channelId} />`
 */
export default function DevBotsToggle({ channelId }: { channelId: string }): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  if (!window.radcordDev) return null
  return (
    <>
      <button type="button" className="voice-status__probe" aria-pressed={open} title="Área de testes (só no npm run desktop)" onClick={() => setOpen(!open)}>
        Testes
      </button>
      {open && <DevBotsPanel channelId={channelId} onClose={() => setOpen(false)} />}
    </>
  )
}

function DevBotsPanel({ channelId, onClose }: { channelId: string; onClose: () => void }): React.JSX.Element {
  const bots = useDevBots()
  const session = useSessionStore((store) => store.session)
  const [error, setError] = useState<string | null>(null)

  async function run(task: () => Promise<unknown>): Promise<void> {
    setError(null)
    try {
      await task()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : String(failure))
    }
  }

  function addBot(): void {
    const dev = window.radcordDev
    if (!dev || !session) return
    void run(() => dev.addBot({ apiUrl: session.api.baseUrl, session: session.token, channelId }))
  }

  function act(number: number, action: DevBotAction): void {
    const dev = window.radcordDev
    if (dev) void run(() => dev.actOnBot(number, action))
  }

  function playWav(number: number): void {
    const dev = window.radcordDev
    if (!dev) return
    void run(async () => {
      const path = await dev.pickWav()
      if (path) await dev.actOnBot(number, { kind: 'wav', path })
    })
  }

  return (
    <aside className="dev-bots" role="dialog" aria-label="Área de testes">
      <div className="dev-bots__head">
        <strong>Área de testes</strong>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
      </div>
      <p className="dev-bots__hint">Só no npm run desktop. Cada bot entra neste canal como uma pessoa e toca em loop até Parar.</p>
      <Button variant="primary" onClick={addBot} disabled={!session}>Adicionar bot</Button>
      {error && <p className="dev-bots__error">{error}</p>}
      <ul className="dev-bots__list">
        {bots.map((bot) => (
          <DevBotItem key={bot.number} bot={bot} onAct={(action) => act(bot.number, action)} onWav={() => playWav(bot.number)} />
        ))}
      </ul>
    </aside>
  )
}

function DevBotItem({ bot, onAct, onWav }: { bot: DevBotView; onAct: (action: DevBotAction) => void; onWav: () => void }): React.JSX.Element {
  const live = bot.phase === 'joined' || bot.phase === 'playing' || bot.phase === 'idle'
  return (
    <li className="dev-bots__bot">
      <div className="dev-bots__row">
        <strong>{bot.name}</strong>
        <span>{devBotPhaseLabel(bot.phase)}</span>
      </div>
      {bot.detail && <p className="dev-bots__detail">{bot.detail}</p>}
      <div className="dev-bots__actions">
        <Button variant="success" disabled={!live} onClick={() => onAct({ kind: 'tone' })}>Sinal de teste</Button>
        <Button variant="secondary" disabled={!live} onClick={onWav}>Tocar WAV…</Button>
        <Button variant="secondary" disabled={bot.phase !== 'playing'} onClick={() => onAct({ kind: 'stop' })}>Parar</Button>
        <Button variant="danger" onClick={() => onAct({ kind: 'remove' })}>Remover</Button>
      </div>
    </li>
  )
}

function useDevBots(): DevBotView[] {
  const [bots, setBots] = useState<DevBotView[]>([])
  useEffect(() => {
    const dev = window.radcordDev
    if (!dev) return undefined
    void dev.bots().then(setBots)
    return dev.onBots(setBots)
  }, [])
  return bots
}
