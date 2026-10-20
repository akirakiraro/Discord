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
  const updateUser = useSessionStore((store) => store.updateUser)
  const applyChat = useChatStore((store) => store.applyChat)
  const session = useSessionStore((store) => store.session)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onFile(file: File | undefined): Promise<void> {
    if (!file) return
    try {
      setAvatarUrl(await readChosenPhoto(file))
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  async function save(): Promise<void> {
    if (!session || saving) return
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
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile-modal" role="dialog" aria-labelledby="profile-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="profile-title">Perfil</h2>
        <Avatar name={displayName || user.displayName} seed={user.id} imageUrl={avatarUrl} size={80} />
        <label className="profile-modal__file">
          Escolher foto
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void onFile(event.target.files?.[0])} />
        </label>
        {avatarUrl && (
          <button type="button" className="profile-modal__text" onClick={() => setAvatarUrl(null)}>
            Remover foto
          </button>
        )}
        <label>
          Nome
          <input value={displayName} maxLength={32} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <p className="profile-modal__username">
          Usuário <strong>{user.username}</strong>
        </p>
        {error && <p className="profile-modal__error">{error}</p>}
        <div className="profile-modal__actions">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="profile-modal__save" disabled={saving} onClick={() => void save()}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
