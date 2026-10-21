import { AuthScreen } from './components/auth/AuthScreen'
import { AppShell } from './components/layout/AppShell'
import { useDesktopUpdate } from './hooks/useDesktopUpdate'
import { useRestoreSession } from './hooks/useRestoreSession'
import { useSessionStore } from './stores/sessionStore'

export function App(): React.JSX.Element {
  const restoring = useRestoreSession()
  const session = useSessionStore((store) => store.session)
  useDesktopUpdate()

  if (restoring) return <div className="splash-screen">Conectando ao host…</div>
  if (!session) return <AuthScreen />
  return <AppShell session={session} />
}
