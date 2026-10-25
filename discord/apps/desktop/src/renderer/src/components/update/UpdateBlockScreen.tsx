import { PRODUCT_DISPLAY_NAME } from '../../../../shared/appIdentity'
import type { UpdateSnapshot } from '../../../../shared/desktopUpdateSnapshot'
import { updateBlockBody, updateIsIndeterminate } from '../../lib/update/updateView'
import { UpdateProgressBar } from './UpdateProgressBar'

interface UpdateBlockScreenProps {
  snapshot: UpdateSnapshot
  onRetry: () => void
}

/** Tela cheia no lugar do login enquanto a versão instalada não está em dia. */
export function UpdateBlockScreen({ snapshot, onRetry }: UpdateBlockScreenProps): React.JSX.Element {
  const failed = snapshot.phase === 'error'
  return (
    <div className="auth-screen update-block">
      <section className="auth-card update-block__card">
        <h1>Atualizando o {PRODUCT_DISPLAY_NAME}...</h1>
        <p className="auth-card__subtitle">{updateBlockBody(snapshot)}</p>
        <InstallingProgress snapshot={snapshot} />
        {failed && (
          <button type="button" className="button button--primary" onClick={onRetry}>
            Tentar novamente
          </button>
        )}
      </section>
    </div>
  )
}

function InstallingProgress({ snapshot }: { snapshot: UpdateSnapshot }): React.JSX.Element | null {
  if (!updateIsIndeterminate(snapshot)) return null
  return (
    <div className="update-block__progress">
      <UpdateProgressBar percent={null} />
    </div>
  )
}
