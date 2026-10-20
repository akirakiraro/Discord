import { useState } from 'react'
import { logout } from '../../lib/auth/logout'
import { useSessionStore } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { HeadsetIcon, MicIcon } from '../common/AudioIcons'
import { Avatar } from '../common/Avatar'
import { ProfileModal } from './ProfileModal'

export function UserPanel(): React.JSX.Element | null {
  const session = useSessionStore((store) => store.session)
  const { micMuted, deafened, toggleMic, toggleDeafen } = useVoiceStore()
  const [profileOpen, setProfileOpen] = useState(false)
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
      <button className="icon-button" title="Sair da conta" onClick={() => void logout(session)}>
        ⏏️
      </button>
      {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
