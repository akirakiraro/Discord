import { useEffect, useRef } from 'react'

/**
 * Uma vez por abertura, pergunta aos releases do GitHub se há um Radcord mais novo.
 * Exemplo: `useDesktopUpdate()`
 */
export function useDesktopUpdate(): void {
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    const check = window.radcord?.checkForUpdate
    if (!check) return
    started.current = true
    void check().catch(() => undefined)
  }, [])
}
