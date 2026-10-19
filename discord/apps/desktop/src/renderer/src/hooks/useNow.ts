import { useEffect, useState } from 'react'

/**
 * Relógio que re-renderiza o componente a cada intervalo (ex.: expirar o "digitando…").
 * Exemplo: `const nowMs = useNow(1000)`
 */
export function useNow(intervalMs: number): number {
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return nowMs
}
