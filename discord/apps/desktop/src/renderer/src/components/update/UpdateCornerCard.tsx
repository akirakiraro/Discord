import type { UpdateSnapshot } from '../../../../shared/desktopUpdateSnapshot'
import { updateCardDetail, updateCardTitle, updateIsIndeterminate, updatePercent } from '../../lib/update/updateView'
import { UpdateProgressBar } from './UpdateProgressBar'
import { Button } from '../ui/Button'

interface UpdateCornerCardProps {
  snapshot: UpdateSnapshot
  onRetry: () => void
}

/** Progresso fixo no canto inferior direito. A call continua atrás dele. */
export function UpdateCornerCard({ snapshot, onRetry }: UpdateCornerCardProps): React.JSX.Element {
  const percent = updatePercent(snapshot)
  const detail = updateCardDetail(snapshot)
  const showBar = percent !== null || updateIsIndeterminate(snapshot)
  return (
    <aside className="update-corner" aria-live="polite">
      <p className="update-corner__title">{updateCardTitle(snapshot)}</p>
      {showBar && <UpdateProgressBar percent={percent} />}
      {detail && <p className="update-corner__detail">{detail}</p>}
      {snapshot.phase === 'error' && (
        <Button variant="primary" className="update-corner__retry" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </aside>
  )
}
