import { useState } from 'react'
import { logout } from '../../lib/auth/logout'
import { useSessionStore } from '../../stores/sessionStore'
import { Avatar } from '../common/Avatar'
import { VoiceSettings } from './VoiceSettings'

type SettingsTab = 'conta' | 'voz'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'conta', label: 'Minha conta' },
  { id: 'voz', label: 'Voz' },
]

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps): React.JSX.Element {
  const [tab, setTab] = useState<SettingsTab>('conta')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" role="dialog" aria-label="Configurações" onClick={(event) => event.stopPropagation()}>
        <SettingsNav tab={tab} onSelect={setTab} />
        <div className="settings-modal__content">
          <button type="button" className="settings-modal__close" title="Fechar" aria-label="Fechar" onClick={onClose} />
          {tab === 'conta' ? <AccountSettings /> : <VoiceSettings />}
        </div>
      </div>
    </div>
  )
}

function SettingsNav({ tab, onSelect }: { tab: SettingsTab; onSelect: (tab: SettingsTab) => void }): React.JSX.Element {
  return (
    <nav className="settings-nav" aria-label="Seções">
      <p className="settings-nav__label">Configurações do usuário</p>
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={tab === item.id ? 'settings-nav__item settings-nav__item--active' : 'settings-nav__item'}
          aria-current={tab === item.id ? 'page' : undefined}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

function AccountSettings(): React.JSX.Element {
  const session = useSessionStore((store) => store.session)
  const user = session?.user

  return (
    <div className="settings-pane settings-pane--account">
      <h2>Minha conta</h2>
      {user && (
        <div className="settings-account">
          <Avatar name={user.displayName} seed={user.id} imageUrl={user.avatarUrl} size={64} />
          <div>
            <p className="settings-account__name">{user.displayName}</p>
            <p className="settings-account__username">{user.username}</p>
          </div>
        </div>
      )}
      {session && (
        <button type="button" className="button settings-modal__logout" onClick={() => void logout(session)}>
          Sair da conta
        </button>
      )}
    </div>
  )
}
