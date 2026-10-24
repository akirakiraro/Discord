import { updateBlocksLogin, type UpdateSnapshot } from '../../../../shared/desktopUpdateSnapshot'
import { UpdateCornerCard } from './UpdateCornerCard'
import { UpdateRestartModal } from './UpdateRestartModal'

interface UpdateChromeProps {
  snapshot: UpdateSnapshot
  onRetry: () => void
  onInstall: () => void
}

/** Cartão e modal por cima do login ou da call. Some quando a versão está em dia. */
export function UpdateChrome({ snapshot, onRetry, onInstall }: UpdateChromeProps): React.JSX.Element | null {
  if (!updateBlocksLogin(snapshot)) return null
  return (
    <>
      <UpdateCornerCard snapshot={snapshot} onRetry={onRetry} />
      {snapshot.phase === 'ready' && <UpdateRestartModal version={snapshot.version} onInstall={onInstall} />}
    </>
  )
}
