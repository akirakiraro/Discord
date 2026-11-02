import { PRODUCT_DISPLAY_NAME } from '../../../../shared/appIdentity'
import { Button } from '../ui/Button'

interface UpdateRestartModalProps {
  version: string | null
  onInstall: () => void
}

/** O OK instala e reabre. Não dá para dispensar: a versão nova já está baixada. */
export function UpdateRestartModal({ version, onInstall }: UpdateRestartModalProps): React.JSX.Element {
  const downloaded = version ? `A versão ${version} já foi baixada.` : 'A atualização já foi baixada.'
  return (
    <div className="modal-backdrop update-modal-backdrop">
      <div className="profile-modal update-modal" role="dialog" aria-modal="true" aria-labelledby="update-restart-title">
        <h2 id="update-restart-title">Reiniciar o {PRODUCT_DISPLAY_NAME}</h2>
        <p>{downloaded} O app precisa reiniciar para instalar e abrir de novo.</p>
        <Button variant="primary" onClick={onInstall}>
          OK
        </Button>
      </div>
    </div>
  )
}
