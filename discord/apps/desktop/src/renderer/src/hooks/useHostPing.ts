import { useEffect, useState } from 'react'
import { measureHostPingMs } from '../lib/hostApi'

const PING_INTERVAL_MS = 3000

/**
 * Ping periódico até a API do host; `null` quando o host não responde.
 * Exemplo: `const pingMs = useHostPing(session.hostBaseUrl)`
 */
export function useHostPing(hostBaseUrl: string): number | null {
  const [pingMs, setPingMs] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const measure = (): void => {
      measureHostPingMs(hostBaseUrl)
        .then((ms) => active && setPingMs(ms))
        .catch(() => active && setPingMs(null))
    }
    measure()
    const timer = setInterval(measure, PING_INTERVAL_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [hostBaseUrl])

  return pingMs
}
