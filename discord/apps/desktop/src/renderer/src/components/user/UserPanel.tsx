import { logout } from '../../lib/auth/logout'
import { useSessionStore } from '../../stores/sessionStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { Avatar } from '../common/Avatar'

export function UserPanel(): React.JSX.Element | null {
  const session = useSessionStore((store) => store.session)
  const { micMuted, deafened, toggleMic, toggleDeafen } = useVoiceStore()
  if (!session) return null
  const { user } = session

  return (
    <div className="user-panel">
      <Avatar name={user.displayName} seed={user.id} online />
      <div className="user-panel__identity">
        <span className="user-panel__name">{user.displayName}</span>
        <span className="user-panel__username">@{user.username}</span>
      </div>
      <button className={micMuted ? 'icon-button icon-button--off' : 'icon-button'} title="Mutar" onClick={toggleMic}>
        {micMuted ? '🔇' : '🎙️'}
      </button>
      <button className={deafened ? 'icon-button icon-button--off' : 'icon-button'} title="Ensurdecer" onClick={toggleDeafen}>
        {deafened ? '🔕' : '🎧'}
      </button>
      <button className="icon-button" title="Sair da conta" onClick={() => void logout(session)}>
        ⏏️
      </button>
    </div>
  )
}
