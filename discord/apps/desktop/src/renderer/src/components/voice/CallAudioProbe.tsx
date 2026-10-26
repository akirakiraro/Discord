import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { RoomEvent } from 'livekit-client'
import { isMonitorIdentity } from '@radcord/shared'
import { voiceRoom, voiceSession } from '../../lib/voice/voiceSession'
import { listenerGain, percentFromGain } from '../../lib/voice/listenerVolume'
import { useListenerVolumeStore } from '../../stores/listenerVolumeStore'
import { useSessionStore } from '../../stores/sessionStore'
import {
  PROBE_INTERVAL_MS,
  probeFailureView,
  seesCallAudioProbe,
  type CallAudioProbeView,
  type ProbeCarry,
  type ProbeMemory,
  type ProbeMetric,
  type ProbeTone,
} from '../../lib/voice/callAudioProbe'
import { sampleCallAudioProbe } from '../../lib/voice/collectCallAudioProbe'
import {
  appendProbeEvents,
  formatProbeClock,
  serializeProbeDump,
  sparklinePoints,
  type ProbeEvent,
  type ProbeHistory,
  type ProbePoint,
} from '../../lib/voice/probeTrace'

interface ProbeHold extends ProbeCarry {
  memory: ProbeMemory
  pending: ProbeEvent[]
}

/**
 * Botão do debug. Some para qualquer usuário que não seja `akira`.
 * Exemplo: `<CallAudioProbeButton username="akira" inCall open={false} onToggle={fn} />`
 */
export function CallAudioProbeButton({
  username,
  inCall,
  open,
  onToggle,
}: {
  username: string | null
  inCall: boolean
  open: boolean
  onToggle: () => void
}): React.JSX.Element | null {
  if (!seesCallAudioProbe(username) || !inCall) return null
  return (
    <button type="button" className="voice-status__probe" aria-pressed={open} title="Debug de áudio da call" onClick={onToggle}>
      Áudio
    </button>
  )
}

/** Painel já calculado. O teste renderiza isto sem abrir a call. */
export function AudioProbeSheet({
  view,
  note,
  onClose,
  onCopy,
  onSave,
}: {
  view: CallAudioProbeView | null
  note?: string
  onClose: () => void
  onCopy: () => void
  onSave: () => void
}): React.JSX.Element {
  return (
    <aside className="audio-probe" role="dialog" aria-label="Debug de áudio">
      <div className="audio-probe__head">
        <strong>Debug de áudio</strong>
        <button type="button" className="audio-probe__close" onClick={onClose}>Fechar</button>
      </div>
      <p className="audio-probe__hint">Só neste aparelho. Nada disto sai para o servidor. Atualiza a cada 1 s enquanto está aberto.</p>
      <p className="audio-probe__legend">Vermelho: perda acima de 2%, jitter acima de 30 ms, RTT ou jitter buffer acima de 150 ms, TCP, ocultação ou NACK no último segundo, ou o Chromium tratando a voz.</p>
      <div className="audio-probe__actions">
        <button type="button" onClick={onCopy} disabled={!view}>Copiar JSON</button>
        <button type="button" onClick={onSave} disabled={!view}>Salvar arquivo</button>
        {note && <span>{note}</span>}
      </div>
      {view ? <ProbeBody view={view} /> : <p>Lendo a call…</p>}
    </aside>
  )
}

/**
 * Liga o botão na barra de voz. Fechado, não chama `getStats`.
 * Exemplo: `<CallAudioProbe username={user.username} inCall />`
 */
export function CallAudioProbe({ username, inCall }: { username: string | null; inCall: boolean }): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  if (!seesCallAudioProbe(username) || !inCall) return null
  return (
    <>
      <CallAudioProbeButton username={username} inCall={inCall} open={open} onToggle={() => setOpen((value) => !value)} />
      {open && <LiveProbeSheet onClose={() => setOpen(false)} />}
    </>
  )
}

function LiveProbeSheet({ onClose }: { onClose: () => void }): React.JSX.Element {
  const view = useCallAudioProbe(true)
  const [note, setNote] = useState('')
  const json = view ? dumpOf(view) : ''
  return (
    <AudioProbeSheet
      view={view}
      note={note}
      onClose={onClose}
      onCopy={() => void copyJson(json, setNote)}
      onSave={() => saveJson(json, setNote)}
    />
  )
}

function useCallAudioProbe(active: boolean): CallAudioProbeView | null {
  const [view, setView] = useState<CallAudioProbeView | null>(null)
  const hold = useRef<ProbeHold>(emptyHold())
  useEffect(() => (active ? pollProbe(hold, setView) : undefined), [active])
  useEffect(() => (active ? watchReconnect(hold) : undefined), [active])
  if (!active) return null
  return view
}

function pollProbe(hold: MutableRefObject<ProbeHold>, setView: (view: CallAudioProbeView) => void): () => void {
  let stopped = false
  let pending = false
  const tick = () => {
    if (stopped || pending) return
    pending = true
    void takeSample(hold, () => stopped, setView).finally(() => {
      pending = false
    })
  }
  tick()
  const timer = setInterval(tick, PROBE_INTERVAL_MS)
  return () => {
    stopped = true
    clearInterval(timer)
  }
}

async function takeSample(hold: MutableRefObject<ProbeHold>, stopped: () => boolean, setView: (view: CallAudioProbeView) => void): Promise<void> {
  const started = hold.current.pending.splice(0)
  try {
    const next = await sampleCallAudioProbe(voiceRoom, held(hold.current, started), Date.now(), {
      chain: voiceSession.micDebug(),
      volumes: volumeRows(),
    })
    if (stopped()) return
    keepHold(hold.current, next)
    setView(next.view)
  } catch (error) {
    if (stopped()) return
    setView(probeFailureView(error instanceof Error ? error.message : String(error)))
  }
}

function held(hold: ProbeHold, started: ProbeEvent[]): ProbeHold {
  return { ...hold, events: appendProbeEvents(hold.events ?? [], started) }
}

function keepHold(hold: ProbeHold, next: Awaited<ReturnType<typeof sampleCallAudioProbe>>): void {
  const late = hold.pending.splice(0)
  hold.memory = next.memory
  hold.history = next.history
  hold.events = appendProbeEvents(next.events, late)
  hold.transports = next.transports
  hold.names = next.names
  hold.device = next.device
  hold.seen = next.seen
}

function watchReconnect(hold: MutableRefObject<ProbeHold>): () => void {
  const note = (detail: string) => hold.current.pending.push({ atMs: Date.now(), kind: 'reconectou', detail })
  const onTry = () => note('a call está reconectando')
  const onBack = () => note('a mídia voltou')
  voiceRoom.on(RoomEvent.Reconnecting, onTry)
  voiceRoom.on(RoomEvent.Reconnected, onBack)
  return () => {
    voiceRoom.off(RoomEvent.Reconnecting, onTry)
    voiceRoom.off(RoomEvent.Reconnected, onBack)
  }
}

function volumeRows(): Array<{ name: string; percent: number }> {
  const localUserId = useSessionStore.getState().session?.user.id ?? ''
  const file = useListenerVolumeStore.getState().file
  return [...voiceRoom.remoteParticipants.values()].flatMap((person) => volumeOf(person.identity, person.name, localUserId, file))
}

function volumeOf(identity: string, name: string | undefined, localUserId: string, file: Parameters<typeof listenerGain>[0]): Array<{ name: string; percent: number }> {
  if (isMonitorIdentity(identity)) return []
  return [{ name: name || identity, percent: percentFromGain(listenerGain(file, localUserId, identity)) }]
}

function emptyHold(): ProbeHold {
  return { memory: {}, history: {}, events: [], transports: {}, names: {}, device: null, seen: null, pending: [] }
}

function dumpOf(view: CallAudioProbeView): string {
  return serializeProbeDump({
    lidoEm: formatProbeClock(Date.now()),
    faixas: view.legs,
    captura: view.capture,
    cadeia: view.chain,
    volumes: view.volumes,
    contexto: view.context,
    historico: view.history,
    eventos: view.events,
  })
}

async function copyJson(json: string, setNote: (note: string) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(json)
    setNote('JSON copiado')
  } catch (error) {
    setNote(error instanceof Error ? error.message : 'Não copiou o JSON')
  }
}

function saveJson(json: string, setNote: (note: string) => void): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `soundroom-audio-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
  setNote('Arquivo gerado neste PC')
}

function ProbeBody({ view }: { view: CallAudioProbeView }): React.JSX.Element {
  return (
    <>
      {view.capture && <ProbeBlock title="Captura do microfone" rows={view.capture} />}
      {view.context && <ProbeBlock title="AudioContext do microfone" rows={view.context} />}
      {view.chain ? <ProbeBlock title="Cadeia do microfone" rows={view.chain} /> : <p>Cadeia do microfone ainda não está ligada.</p>}
      {view.volumes && view.volumes.length > 0 && <ProbeBlock title="Volume por pessoa neste PC" rows={view.volumes} />}
      {view.empty && <p>{view.empty}</p>}
      {view.legs.map((leg) => (
        <ProbeBlock key={leg.key} title={leg.title} rows={leg.metrics} points={view.history[leg.key] ?? []} />
      ))}
      <ProbeLog events={view.events} />
    </>
  )
}

function ProbeBlock({ title, rows, points }: { title: string; rows: ProbeMetric[]; points?: ProbePoint[] }): React.JSX.Element {
  return (
    <section className="audio-probe__block">
      <h3>{title}</h3>
      {points && points.length > 0 && <ProbeCharts points={points} />}
      <dl>
        {rows.map((row) => (
          <div key={row.label} className="audio-probe__row">
            <dt>{row.label}</dt>
            <dd className={toneClass(row.tone)}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function ProbeCharts({ points }: { points: ProbePoint[] }): React.JSX.Element {
  return (
    <div className="audio-probe__charts">
      <Spark title="Perda" values={points.map((point) => point.loss)} />
      <Spark title="Jitter" values={points.map((point) => point.jitterMs)} />
      <Spark title="Bitrate" values={points.map((point) => point.bitrate)} />
    </div>
  )
}

function Spark({ title, values }: { title: string; values: Array<number | null> }): React.JSX.Element {
  const points = sparklinePoints(values, 120, 28)
  return (
    <figure className="audio-probe__spark">
      <figcaption>{title}</figcaption>
      <svg viewBox="0 0 120 28" width="120" height="28" role="img" aria-label={title}>
        {points && <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />}
      </svg>
    </figure>
  )
}

function ProbeLog({ events }: { events: ProbeEvent[] }): React.JSX.Element {
  return (
    <section className="audio-probe__block">
      <h3>Eventos</h3>
      {events.length === 0 && <p>Nenhum evento ainda.</p>}
      <ol className="audio-probe__log">
        {events.map((event, index) => (
          <li key={`${event.atMs}-${index}`}>{formatProbeClock(event.atMs)} · {event.kind} · {event.detail}</li>
        ))}
      </ol>
    </section>
  )
}

function toneClass(tone: ProbeTone): string {
  if (tone === 'idle') return 'audio-probe__value'
  return `audio-probe__value audio-probe__value--${tone}`
}
