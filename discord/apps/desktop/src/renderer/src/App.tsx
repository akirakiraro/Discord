import { updateBlocksLogin, type UpdateSnapshot } from '../../shared/desktopUpdateSnapshot'
import { AuthScreen } from './components/auth/AuthScreen'
import { AppShell } from './components/layout/AppShell'
import { UpdateBlockScreen } from './components/update/UpdateBlockScreen'
import { UpdateChrome } from './components/update/UpdateChrome'
import { HostQuitModal } from './components/user/HostQuitModal'
import { useDesktopUpdate } from './hooks/useDesktopUpdate'
import { useHostQuitPrompt } from './hooks/useHostQuitPrompt'
import { useRestoreSession } from './hooks/useRestoreSession'
import { useSessionStore, type AuthSession } from './stores/sessionStore'

export function App(): React.JSX.Element {
  const update = useDesktopUpdate()
  const blocked = updateBlocksLogin(update.snapshot)
  const restoring = useRestoreSession(!blocked)
  const session = useSessionStore((store) => store.session)
  const hostQuit = useHostQuitPrompt()

  return (
    <>
      <AppMain blocked={blocked} restoring={restoring} session={session} snapshot={update.snapshot} onRetry={update.retry} />
      <UpdateChrome snapshot={update.snapshot} onRetry={update.retry} onInstall={update.install} />
      {hostQuit.prompt && <HostQuitModal prompt={hostQuit.prompt} onConfirm={hostQuit.confirm} onDismiss={hostQuit.dismiss} />}
    </>
  )
}

interface AppMainProps {
  blocked: boolean
  restoring: boolean
  session: AuthSession | null
  snapshot: UpdateSnapshot
  onRetry: () => void
}

function AppMain({ blocked, restoring, session, snapshot, onRetry }: AppMainProps): React.JSX.Element {
  if (blocked && !session) return <UpdateBlockScreen snapshot={snapshot} onRetry={onRetry} />
  if (restoring) return <div className="splash-screen">Conectando ao host…</div>
  if (!session) return <AuthScreen />
  return <AppShell session={session} />
}
