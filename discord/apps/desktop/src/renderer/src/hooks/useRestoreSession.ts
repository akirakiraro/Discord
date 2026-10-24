import { useEffect, useState } from 'react'
import { restoreSession } from '../lib/auth/authenticate'
import { forgetLoginToken, loadSavedLogin } from '../lib/savedLogin'
import { useSessionStore } from '../stores/sessionStore'

/**
 * Reaproveita o token salvo depois que a atualização libera o login.
 * Devolve `true` enquanto verifica. Exemplo: `const restoring = useRestoreSession(!blocked)`
 */
export function useRestoreSession(allow: boolean): boolean {
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    if (!allow) return undefined
    return restoreSavedSession(setSettled)
  }, [allow])

  if (!allow || settled) return false
  return loadSavedLogin(window.localStorage).token !== null
}

function restoreSavedSession(setSettled: (settled: boolean) => void): () => void {
  const { hostAddress, token } = loadSavedLogin(window.localStorage)
  if (!token) {
    setSettled(true)
    return () => undefined
  }
  let cancelled = false
  restoreSession(hostAddress, token)
    .then((session) => {
      if (cancelled) return
      if (session) useSessionStore.getState().signIn(session)
      else forgetLoginToken(window.localStorage)
    })
    .catch((error: unknown) => {
      if (!cancelled) useSessionStore.getState().signOut(error instanceof Error ? error.message : String(error))
    })
    .finally(() => {
      if (!cancelled) setSettled(true)
    })
  return () => {
    cancelled = true
  }
}
