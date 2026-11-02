import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { HOST_UNAVAILABLE, parseHostSnapshot, type HostSnapshot } from '../../../shared/hostSnapshot'

const useHostStartRequest = create<{ pending: boolean }>(() => ({ pending: false }))

/**
 * Espelha o host do processo principal. Sem módulo, fica indisponível e a tela não mostra nada.
 * Depois de `startHost()`, já mostra "Iniciando" sem esperar o processo principal responder.
 * Exemplo: `const host = useHostPower()`.
 */
export function useHostPower(): HostSnapshot {
  const [snapshot, setSnapshot] = useState<HostSnapshot>(HOST_UNAVAILABLE)
  const pending = useHostStartRequest((store) => store.pending)

  useEffect(() => {
    const bridge = window.radcord
    if (!bridge?.hostStatus) return undefined
    let alive = true
    const apply = (next: HostSnapshot): void => {
      if (alive) setSnapshot(parseHostSnapshot(next))
    }
    void bridge.hostStatus().then(apply)
    const timer = setInterval(() => void bridge.hostStatus().then(apply), 2000)
    const stop = bridge.onHostState(apply)
    return () => {
      alive = false
      clearInterval(timer)
      stop()
    }
  }, [])

  return withPendingStart(snapshot, pending)
}

/**
 * Liga o host. O botão some na hora e outro clique, enquanto liga, não pede de novo.
 * Exemplo: `<Button onClick={() => void startHost()}>Ligar host</Button>`.
 */
export async function startHost(): Promise<void> {
  const bridge = window.radcord
  if (!bridge || useHostStartRequest.getState().pending) return
  useHostStartRequest.setState({ pending: true })
  try {
    await bridge.hostStart()
  } finally {
    useHostStartRequest.setState({ pending: false })
  }
}

/**
 * Enquanto o pedido de ligar não volta, desligado ou erro aparecem como "Iniciando".
 * Exemplo: `withPendingStart(offSnapshot, true).phase` é `'starting'`.
 */
export function withPendingStart(snapshot: HostSnapshot, pending: boolean): HostSnapshot {
  if (!pending) return snapshot
  if (snapshot.phase !== 'off' && snapshot.phase !== 'error') return snapshot
  return { ...snapshot, phase: 'starting', message: null }
}
