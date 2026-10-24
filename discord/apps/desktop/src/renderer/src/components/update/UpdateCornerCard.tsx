import type { UpdateSnapshot } from '../../../../shared/desktopUpdateSnapshot'
import { updateCardDetail, updateCardTitle, updatePercent } from '../../lib/update/updateView'

interface UpdateCornerCardProps {
  snapshot: UpdateSnapshot
  onRetry: () => void
}

/** Progresso fixo no canto inferior direito. A call continua atrás dele. */
export function UpdateCornerCard({ snapshot, onRetry }: UpdateCornerCardProps): React.JSX.Element {
  const percent = updatePercent(snapshot)
  const detail = updateCardDetail(snapshot)
  return (
    <aside className="update-corner" aria-live="polite">
      <p className="update-corner__title">{updateCardTitle(snapshot)}</p>
      {percent !== null && <UpdateBar percent={percent} />}
      {detail && <p className="update-corner__detail">{detail}</p>}
      {snapshot.phase === 'error' && (
        <button type="button" className="button button--primary update-corner__retry" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </aside>
  )
}

function UpdateBar({ percent }: { percent: number }): React.JSX.Element {
  const shown = Math.round(percent)
  return (
    <div className="update-corner__bar" role="progressbar" aria-valuenow={shown} aria-valuemin={0} aria-valuemax={100}>
      <div className="update-corner__fill" style={{ width: `${shown}%` }} />
    </div>
  )
}
