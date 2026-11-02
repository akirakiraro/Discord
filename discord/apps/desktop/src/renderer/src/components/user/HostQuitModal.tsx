import type { HostQuitPrompt } from '../../../../shared/hostSnapshot'
import { Button } from '../ui/Button'

interface HostQuitModalProps {
  prompt: HostQuitPrompt
  onConfirm: () => void
  onDismiss: () => void
}

/**
 * Fechar o app com gente na call. Exemplo: `<HostQuitModal prompt={prompt} onConfirm={confirm} onDismiss={dismiss} />`
 */
export function HostQuitModal({ prompt, onConfirm, onDismiss }: HostQuitModalProps): React.JSX.Element {
  return (
    <div className="modal-backdrop">
      <div className="profile-modal" role="alertdialog" aria-modal="true" aria-labelledby="host-quit-title">
        <h2 id="host-quit-title">Desligar o host</h2>
        <p>{prompt.message}</p>
        <p>{prompt.online} pessoas online, {prompt.inVoice} na call.</p>
        <Button variant="danger" onClick={onConfirm}>
          Fechar e desligar
        </Button>
        <Button variant="secondary" onClick={onDismiss}>
          Continuar com o host ligado
        </Button>
      </div>
    </div>
  )
}
