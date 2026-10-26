import { useState } from 'react'
import { hostSettingsTab } from '../../../../shared/hostGate'
import { logout } from '../../lib/auth/logout'
import { useHostPower } from '../../hooks/useHostPower'
import { useSessionStore } from '../../stores/sessionStore'
import { HostSettings } from './HostSettings'
import { ProfileEditor } from './ProfileModal'
import { VoiceSettings } from './VoiceSettings'
import { Button } from '../ui/Button'

type SettingsTab = 'conta' | 'voz' | 'host'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'conta', label: 'Minha conta' },
  { id: 'voz', label: 'Voz' },
]

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps): React.JSX.Element {
  const username = useSessionStore((store) => store.session?.user.username)
  const host = useHostPower()
  const hostTab = hostSettingsTab(host.moduleReady, username)
  const tabs = hostTab ? [...TABS, hostTab] : TABS
  const [tab, setTab] = useState<SettingsTab>('conta')
  const visible = tab === 'host' && !hostTab ? 'conta' : tab

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" role="dialog" aria-label="Configurações" onClick={(event) => event.stopPropagation()}>
        <SettingsNav tab={visible} tabs={tabs} onSelect={setTab} />
        <div className="settings-modal__content">
          <button type="button" className="settings-modal__close" title="Fechar" aria-label="Fechar" onClick={onClose} />
          {visible === 'conta' && <AccountSettings />}
          {visible === 'voz' && <VoiceSettings />}
          {visible === 'host' && <HostSettings />}
        </div>
      </div>
    </div>
  )
}

function SettingsNav({ tab, tabs, onSelect }: { tab: SettingsTab; tabs: { id: SettingsTab; label: string }[]; onSelect: (tab: SettingsTab) => void }): React.JSX.Element {
  return (
    <nav className="settings-nav" aria-label="Seções">
      <p className="settings-nav__label">Configurações do usuário</p>
      {tabs.map((item) => (
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
          <ProfileEditor user={user} />
        </div>
      )}
      {session && (
        <Button variant="danger" className="settings-modal__logout" onClick={() => void logout(session)}>
          Sair da conta
        </Button>
      )}
    </div>
  )
}
