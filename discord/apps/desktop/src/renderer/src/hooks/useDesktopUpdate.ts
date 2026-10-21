import { useEffect, useRef } from 'react'
import { buildHostBaseUrl } from '../lib/hostAddress'

/**
 * Uma vez por abertura, pergunta ao host se há um Radcord mais novo.
 * Exemplo: `useDesktopUpdate(loadSavedLogin(window.localStorage).hostAddress)`
 */
export function useDesktopUpdate(hostAddress: string): void {
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    const check = window.radcord?.checkForUpdate
    const baseUrl = hostBaseUrl(hostAddress)
    if (!check || !baseUrl) return
    started.current = true
    void check(baseUrl).catch(() => undefined)
  }, [hostAddress])
}

function hostBaseUrl(hostAddress: string): string | null {
  if (!hostAddress.trim()) return null
  try {
    return buildHostBaseUrl(hostAddress)
  } catch {
    return null
  }
}
