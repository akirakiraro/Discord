import { useState } from 'react'
import { hostOccupancyLine, hostPhaseLabel, type HostSnapshot, type HostStopPreview } from '../../../../shared/hostSnapshot'
import { useHostPower } from '../../hooks/useHostPower'

/**
 * Configurações → Host. A aba só entra na lista quando o gate deixa.
 * Exemplo: `<HostSettings />`
 */
export function HostSettings(): React.JSX.Element {
  const snapshot = useHostPower()
  const [preview, setPreview] = useState<HostStopPreview | null>(null)

  async function askStop(): Promise<void> {
    const next = await window.radcord?.hostPreviewStop()
    if (next) setPreview(next)
  }

  return (
    <HostSettingsPanel
      snapshot={snapshot}
      preview={preview}
      onStart={() => void window.radcord?.hostStart()}
      onAskStop={() => void askStop()}
      onConfirmStop={() => {
        setPreview(null)
        void window.radcord?.hostStop()
      }}
      onCancelStop={() => setPreview(null)}
      onCheckFirewall={() => void window.radcord?.hostFirewall()}
      onOpenFirewall={() => void window.radcord?.hostOpenFirewall()}
    />
  )
}

interface HostSettingsPanelProps {
  snapshot: HostSnapshot
  preview: HostStopPreview | null
  onStart: () => void
  onAskStop: () => void
  onConfirmStop: () => void
  onCancelStop: () => void
  onCheckFirewall: () => void
  onOpenFirewall: () => void
}

/**
 * Painel sem IPC, para o teste ver o texto. Exemplo: `<HostSettingsPanel snapshot={snapshot} ... />`
 */
export function HostSettingsPanel({
  snapshot,
  preview,
  onStart,
  onAskStop,
  onConfirmStop,
  onCancelStop,
  onCheckFirewall,
  onOpenFirewall,
}: HostSettingsPanelProps): React.JSX.Element {
  const running = snapshot.phase === 'on' || snapshot.phase === 'external' || snapshot.phase === 'starting'
  return (
    <div className="settings-pane">
      <h2>Host</h2>
      <p className="host-panel__state">
        {hostPhaseLabel(snapshot.phase)}
        {snapshot.radminIp ? ` · ${snapshot.radminIp}` : ''}
      </p>
      {running && <p className="host-panel__count">{hostOccupancyLine(snapshot.online, snapshot.inVoice)}</p>}
      {snapshot.message && <p className="settings-modal__error">{snapshot.message}</p>}
      <HostPowerButton snapshot={snapshot} onStart={onStart} onAskStop={onAskStop} />
      {preview?.allowed && (
        <div className="host-panel__confirm" role="alertdialog" aria-label="Desligar o host">
          <p>{preview.message}</p>
          <button type="button" className="button button--primary" onClick={onConfirmStop}>
            Desligar mesmo assim
          </button>
          <button type="button" className="button" onClick={onCancelStop}>
            Cancelar
          </button>
        </div>
      )}
      {preview && !preview.allowed && <p className="settings-modal__error">{preview.message}</p>}
      <div className="host-panel__firewall">
        <button type="button" className="button" onClick={onCheckFirewall}>
          Verificar firewall
        </button>
        <button type="button" className="button" onClick={onOpenFirewall}>
          Liberar portas no firewall
        </button>
      </div>
      <HostLog title="API" lines={snapshot.apiLog} />
      <HostLog title="LiveKit" lines={snapshot.livekitLog} />
    </div>
  )
}

function HostPowerButton({ snapshot, onStart, onAskStop }: { snapshot: HostSnapshot; onStart: () => void; onAskStop: () => void }): React.JSX.Element | null {
  if (snapshot.phase === 'external') return <p className="host-panel__hint">O app não desliga um host que foi aberto no terminal.</p>
  if (snapshot.phase === 'on' || snapshot.phase === 'error' && snapshot.ownedByApp) {
    return (
      <button type="button" className="button button--primary" onClick={onAskStop}>
        Desligar host
      </button>
    )
  }
  if (snapshot.phase === 'starting' || snapshot.phase === 'stopping') return <p className="host-panel__hint">{hostPhaseLabel(snapshot.phase)}…</p>
  if (snapshot.phase === 'off' || snapshot.phase === 'error') {
    return (
      <button type="button" className="button button--primary" onClick={onStart}>
        Ligar host
      </button>
    )
  }
  return null
}

function HostLog({ title, lines }: { title: string; lines: string[] }): React.JSX.Element {
  return (
    <section className="host-log">
      <h3>{title}</h3>
      <pre>{lines.length > 0 ? lines.join('\n') : 'Sem linhas ainda.'}</pre>
    </section>
  )
}
