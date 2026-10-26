import { updateBlocksLogin, type UpdateSnapshot } from '../../../../shared/desktopUpdateSnapshot'
import { updateCardTitle } from '../../lib/update/updateView'
import { UpdateCornerCard } from './UpdateCornerCard'
import { UpdateRestartModal } from './UpdateRestartModal'
import { Button } from '../ui/Button'

interface UpdateChromeProps {
  snapshot: UpdateSnapshot
  onRetry: () => void
  onInstall: () => void
}

/** Cartão e modal por cima do login ou da call. Some quando a versão está em dia. */
export function UpdateChrome({ snapshot, onRetry, onInstall }: UpdateChromeProps): React.JSX.Element | null {
  if (snapshot.phase === 'deferred') return <DeferredUpdateCard snapshot={snapshot} onInstall={onInstall} />
  if (!updateBlocksLogin(snapshot)) return null
  return (
    <>
      <UpdateCornerCard snapshot={snapshot} onRetry={onRetry} />
      {snapshot.phase === 'ready' && <UpdateRestartModal version={snapshot.version} onInstall={onInstall} />}
    </>
  )
}

function DeferredUpdateCard({ snapshot, onInstall }: { snapshot: UpdateSnapshot; onInstall: () => void }): React.JSX.Element {
  return (
    <aside className="update-corner" aria-live="polite">
      <p className="update-corner__title">{updateCardTitle(snapshot)}</p>
      {snapshot.message && <p className="update-corner__detail">{snapshot.message}</p>}
      <Button variant="primary" className="update-corner__retry" onClick={onInstall}>
        Instalar depois de desligar o host
      </Button>
    </aside>
  )
}
