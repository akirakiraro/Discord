import { useState } from 'react'
import { useSessionStore } from '../../stores/sessionStore'
import { deafenButtonTitle, micButtonTitle } from '../../lib/voice/micDeafen'
import { useVoiceStore } from '../../stores/voiceStore'
import { GearIcon, HeadsetIcon, MicIcon } from '../common/AudioIcons'
import { Avatar } from '../common/Avatar'
import { SettingsModal } from './SettingsModal'

export function UserPanel(): React.JSX.Element | null {
  const session = useSessionStore((store) => store.session)
  const { micMuted, deafened, toggleMic, toggleDeafen } = useVoiceStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  if (!session) return null
  const { user } = session

  return (
    <div className="user-panel">
      <button type="button" className="user-panel__identity" title="Minha conta" onClick={() => setSettingsOpen(true)}>
        <Avatar name={user.displayName} seed={user.id} imageUrl={user.avatarUrl} online />
        <span className="user-panel__name">{user.displayName}</span>
      </button>
      <button type="button" className={micMuted ? 'icon-button icon-button--off' : 'icon-button'} title={micButtonTitle({ micMuted, deafened })} onClick={toggleMic}>
        <MicIcon off={micMuted} />
      </button>
      <button type="button" className={deafened ? 'icon-button icon-button--off' : 'icon-button'} title={deafenButtonTitle(deafened)} onClick={toggleDeafen}>
        <HeadsetIcon off={deafened} />
      </button>
      <button className="icon-button" title="Configurações" onClick={() => setSettingsOpen(true)}>
        <GearIcon size={20} />
      </button>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
