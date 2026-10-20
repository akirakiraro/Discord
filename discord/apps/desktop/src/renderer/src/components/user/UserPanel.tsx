import { useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { GearIcon, HeadsetIcon, MicIcon } from '../common/AudioIcons'
import { Avatar } from '../common/Avatar'
import { ProfileModal } from './ProfileModal'
import { SettingsModal } from './SettingsModal'

export function UserPanel(): React.JSX.Element | null {
  const session = useSessionStore((store) => store.session)
  const { micMuted, deafened, toggleMic, toggleDeafen } = useVoiceStore()
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  if (!session) return null
  const { user } = session

  return (
    <div className="user-panel">
      <button type="button" className="user-panel__identity" title="Abrir perfil" onClick={() => setProfileOpen(true)}>
        <Avatar name={user.displayName} seed={user.id} imageUrl={user.avatarUrl} online />
        <span className="user-panel__name">{user.displayName}</span>
      </button>
      <button className={micMuted ? 'icon-button icon-button--off' : 'icon-button'} title="Mutar" onClick={toggleMic}>
        <MicIcon off={micMuted} />
      </button>
      <button className={deafened ? 'icon-button icon-button--off' : 'icon-button'} title="Ensurdecer" onClick={toggleDeafen}>
        <HeadsetIcon off={deafened} />
      </button>
      <button className="icon-button" title="Configurações" onClick={() => setSettingsOpen(true)}>
        <GearIcon size={20} />
      </button>
      {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
