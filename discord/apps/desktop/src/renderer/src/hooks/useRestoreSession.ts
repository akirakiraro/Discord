import { useEffect, useState } from 'react'
import { restoreSession } from '../lib/auth/authenticate'
import { forgetLoginToken, loadSavedLogin } from '../lib/savedLogin'
import { useSessionStore } from '../stores/sessionStore'

/**
 * Na abertura do app tenta reaproveitar o token salvo; devolve `true` enquanto verifica.
 * Exemplo: `const restoring = useRestoreSession(); if (restoring) return <Splash />`
 */
export function useRestoreSession(): boolean {
  const [restoring, setRestoring] = useState(() => loadSavedLogin(window.localStorage).token !== null)

  useEffect(() => {
    const { hostAddress, token } = loadSavedLogin(window.localStorage)
    if (!token) return
    restoreSession(hostAddress, token)
      .then((session) => {
        if (session) useSessionStore.getState().signIn(session)
        else forgetLoginToken(window.localStorage)
      })
      .catch((error: unknown) => useSessionStore.getState().signOut(error instanceof Error ? error.message : String(error)))
      .finally(() => setRestoring(false))
  }, [])

  return restoring
}
