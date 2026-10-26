import { useEffect, useState } from 'react'
import { HOST_UNAVAILABLE, parseHostSnapshot, type HostSnapshot } from '../../../shared/hostSnapshot'

/**
 * Espelha o host do processo principal. Sem módulo, fica indisponível e a tela não mostra nada.
 * Exemplo: `const host = useHostPower()`.
 */
export function useHostPower(): HostSnapshot {
  const [snapshot, setSnapshot] = useState<HostSnapshot>(HOST_UNAVAILABLE)

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

  return snapshot
}
