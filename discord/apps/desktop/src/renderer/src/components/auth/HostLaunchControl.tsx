import { useEffect, useRef } from 'react'
import { canShowHostOnLogin } from '../../../../shared/hostGate'
import { hostPhaseLabel, type HostSnapshot } from '../../../../shared/hostSnapshot'
import { Button } from '../ui/Button'

interface HostLaunchControlProps {
  snapshot: HostSnapshot
  onStart: () => void
  onUseAddress: (ip: string) => void
}

/**
 * Na tela de entrar, liga o host deste PC e preenche o IP. Some sem o módulo.
 * Exemplo: `<HostLaunchControl snapshot={host} onStart={start} onUseAddress={setHost} />`
 */
export function HostLaunchControl({ snapshot, onStart, onUseAddress }: HostLaunchControlProps): React.JSX.Element | null {
  const previous = useRef(snapshot.phase)
  useEffect(() => {
    const before = previous.current
    previous.current = snapshot.phase
    if (before !== 'on' && snapshot.phase === 'on' && snapshot.radminIp) onUseAddress(snapshot.radminIp)
  }, [onUseAddress, snapshot.phase, snapshot.radminIp])

  if (!canShowHostOnLogin(snapshot.moduleReady)) return null
  return (
    <div className="host-launch">
      <HostLaunchButton snapshot={snapshot} onStart={onStart} onUseAddress={onUseAddress} />
      {snapshot.message && <p className="host-launch__error">{snapshot.message}</p>}
    </div>
  )
}

function HostLaunchButton({ snapshot, onStart, onUseAddress }: HostLaunchControlProps): React.JSX.Element {
  if (snapshot.phase === 'external') {
    return (
      <Button variant="primary" onClick={() => snapshot.radminIp && onUseAddress(snapshot.radminIp)}>
        Usar o host que já está no ar{snapshot.radminIp ? ` (${snapshot.radminIp})` : ''}
      </Button>
    )
  }
  if (snapshot.phase === 'on') {
    return <p className="host-launch__state">Host ligado neste PC{snapshot.radminIp ? ` · ${snapshot.radminIp}` : ''}</p>
  }
  if (snapshot.phase === 'starting' || snapshot.phase === 'stopping') {
    return <p className="host-launch__state">{hostPhaseLabel(snapshot.phase)}…</p>
  }
  return (
    <Button variant="primary" onClick={onStart}>
      Ligar host neste PC
    </Button>
  )
}
