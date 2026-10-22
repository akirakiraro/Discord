import { useState } from 'react'
import { profileUpdateSchema, type UserDto } from '@radcord/shared'
import { readChosenPhoto } from '../../lib/profile/profilePhoto'
import { withMemberProfile } from '../../lib/chat/chatState'
import { useChatStore } from '../../stores/chatStore'
import { useSessionStore } from '../../stores/sessionStore'
import { Avatar } from '../common/Avatar'

interface ProfileModalProps {
  user: UserDto
  onClose: () => void
}

export function ProfileModal({ user, onClose }: ProfileModalProps): React.JSX.Element {
  return <ProfileView user={user} onClose={onClose} />
}

/** Formulário de foto e nome, usado na aba Minha conta. */
export function ProfileEditor({ user }: { user: UserDto }): React.JSX.Element {
  const updateUser = useSessionStore((store) => store.updateUser)
  const applyChat = useChatStore((store) => store.applyChat)
  const session = useSessionStore((store) => store.session)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset(): void {
    setDisplayName(user.displayName)
    setAvatarUrl(user.avatarUrl ?? null)
    setError(null)
  }

  return (
    <div className="profile-modal">
      <Avatar name={displayName || user.displayName} seed={user.id} imageUrl={avatarUrl} size={80} />
      <PhotoActions avatarUrl={avatarUrl} onFile={(file) => void choosePhoto(file, setAvatarUrl, setError)} onRemove={() => setAvatarUrl(null)} />
      <label>
        Nome
        <input value={displayName} maxLength={32} onChange={(event) => setDisplayName(event.target.value)} />
      </label>
      <p className="profile-modal__username">
        Usuário <strong>{user.username}</strong>
      </p>
      {error && <p className="profile-modal__error">{error}</p>}
      <div className="profile-modal__actions">
        <button type="button" onClick={reset}>
          Cancelar
        </button>
        <button type="button" className="profile-modal__save" disabled={saving} onClick={() => void saveProfile(session, displayName, avatarUrl, setError, setSaving, updateUser, applyChat)}>
          Salvar
        </button>
      </div>
    </div>
  )
}

function ProfileView({ user, onClose }: ProfileModalProps): React.JSX.Element {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile-modal" role="dialog" aria-labelledby="profile-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="profile-title">Perfil</h2>
        <Avatar name={user.displayName} seed={user.id} imageUrl={user.avatarUrl} size={80} />
        <p className="profile-modal__display-name">{user.displayName}</p>
        <p className="profile-modal__username">
          Usuário <strong>{user.username}</strong>
        </p>
        <div className="profile-modal__actions">
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function PhotoActions({
  avatarUrl,
  onFile,
  onRemove,
}: {
  avatarUrl: string | null
  onFile: (file: File | undefined) => void
  onRemove: () => void
}): React.JSX.Element {
  return (
    <div className="profile-modal__photo-actions">
      <label className="profile-modal__file">
        Escolher foto
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} />
      </label>
      {avatarUrl && (
        <button type="button" className="profile-modal__text" onClick={onRemove}>
          Remover foto
        </button>
      )}
    </div>
  )
}

async function choosePhoto(file: File | undefined, setAvatarUrl: (url: string) => void, setError: (message: string | null) => void): Promise<void> {
  if (!file) return
  try {
    setAvatarUrl(await readChosenPhoto(file))
    setError(null)
  } catch (caught) {
    setError(caught instanceof Error ? caught.message : String(caught))
  }
}

async function saveProfile(
  session: ReturnType<typeof useSessionStore.getState>['session'],
  displayName: string,
  avatarUrl: string | null,
  setError: (message: string | null) => void,
  setSaving: (saving: boolean) => void,
  updateUser: (user: UserDto) => void,
  applyChat: ReturnType<typeof useChatStore.getState>['applyChat'],
): Promise<void> {
  if (!session) return
  const parsed = profileUpdateSchema.safeParse({ displayName, avatarUrl })
  if (!parsed.success) {
    setError(parsed.error.issues.map((issue) => issue.message).join(' '))
    return
  }
  setSaving(true)
  try {
    const updated = await session.api.updateProfile(parsed.data)
    updateUser(updated)
    applyChat((state) => withMemberProfile(state, { ...updated, online: true }))
    setError(null)
    setSaving(false)
  } catch (caught) {
    setError(caught instanceof Error ? caught.message : String(caught))
    setSaving(false)
  }
}
