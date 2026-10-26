import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { voiceRoom } from '../../lib/voice/voiceSession'
import {
  PROBE_INTERVAL_MS,
  probeFailureView,
  seesCallAudioProbe,
  type CallAudioProbeView,
  type ProbeMemory,
  type ProbeMetric,
  type ProbeTone,
} from '../../lib/voice/callAudioProbe'
import { sampleCallAudioProbe } from '../../lib/voice/collectCallAudioProbe'

/**
 * Botão do diagnóstico. Some para qualquer usuário que não seja `akira`.
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
    <button type="button" className="voice-status__probe" aria-pressed={open} title="Diagnóstico de áudio da call" onClick={onToggle}>
      Áudio
    </button>
  )
}

/** Painel já calculado. O teste renderiza isto sem abrir a call. */
export function AudioProbeSheet({ view, onClose }: { view: CallAudioProbeView | null; onClose: () => void }): React.JSX.Element {
  return (
    <aside className="audio-probe" role="dialog" aria-label="Diagnóstico de áudio">
      <div className="audio-probe__head">
        <strong>Diagnóstico de áudio</strong>
        <button type="button" className="audio-probe__close" onClick={onClose}>Fechar</button>
      </div>
      <p className="audio-probe__hint">Só neste aparelho. Estas medidas não saem para o servidor. Atualiza a cada 1 s enquanto está aberto.</p>
      <p className="audio-probe__legend">Vermelho: perda acima de 2%, jitter acima de 30 ms, RTT acima de 150 ms, TCP, ou o Chromium tratando a voz.</p>
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
  return <AudioProbeSheet view={view} onClose={onClose} />
}

function useCallAudioProbe(active: boolean): CallAudioProbeView | null {
  const [view, setView] = useState<CallAudioProbeView | null>(null)
  const memory = useRef<ProbeMemory>({})
  useEffect(() => (active ? pollProbe(memory, setView) : undefined), [active])
  if (!active) return null
  return view
}

function pollProbe(memory: MutableRefObject<ProbeMemory>, setView: (view: CallAudioProbeView) => void): () => void {
  let stopped = false
  let pending = false
  const tick = () => {
    if (stopped || pending) return
    pending = true
    void takeSample(memory, () => stopped, setView).finally(() => {
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

async function takeSample(
  memory: MutableRefObject<ProbeMemory>,
  stopped: () => boolean,
  setView: (view: CallAudioProbeView) => void,
): Promise<void> {
  try {
    const next = await sampleCallAudioProbe(voiceRoom, memory.current, Date.now())
    if (stopped()) return
    memory.current = next.memory
    setView(next.view)
  } catch (error) {
    if (stopped()) return
    setView(probeFailureView(error instanceof Error ? error.message : String(error)))
  }
}

function ProbeBody({ view }: { view: CallAudioProbeView }): React.JSX.Element {
  return (
    <>
      {view.capture && <ProbeBlock title="O que o Chromium aplicou no microfone" rows={view.capture} />}
      {view.empty && <p>{view.empty}</p>}
      {view.legs.map((leg) => (
        <ProbeBlock key={leg.key} title={leg.title} rows={leg.metrics} />
      ))}
    </>
  )
}

function ProbeBlock({ title, rows }: { title: string; rows: ProbeMetric[] }): React.JSX.Element {
  return (
    <section className="audio-probe__block">
      <h3>{title}</h3>
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

function toneClass(tone: ProbeTone): string {
  if (tone === 'idle') return 'audio-probe__value'
  return `audio-probe__value audio-probe__value--${tone}`
}
