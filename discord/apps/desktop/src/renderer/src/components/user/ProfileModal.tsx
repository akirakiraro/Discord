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

/** Cartão da aba Minha conta. A edição só abre depois de Editar. */
export function ProfileEditor({ user }: { user: UserDto }): React.JSX.Element {
  const updateUser = useSessionStore((store) => store.updateUser)
  const applyChat = useChatStore((store) => store.applyChat)
  const session = useSessionStore((store) => store.session)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const shownName = editing ? displayName || user.displayName : user.displayName
  const shownPhoto = editing ? avatarUrl : (user.avatarUrl ?? null)

  function startEdit(): void {
    setDisplayName(user.displayName)
    setAvatarUrl(user.avatarUrl ?? null)
    setError(null)
    setEditing(true)
  }

  function cancel(): void {
    setError(null)
    setEditing(false)
  }

  async function save(): Promise<void> {
    const saved = await saveProfile(session, displayName, avatarUrl, setError, setSaving, updateUser, applyChat)
    if (saved) setEditing(false)
  }

  return (
    <div className="account-profile">
      <Avatar name={shownName} seed={user.id} imageUrl={shownPhoto} size={80} />
      <div className="account-profile__text">
        {editing ? <NameField value={displayName} onChange={setDisplayName} /> : <p className="settings-account__name">{user.displayName}</p>}
        <p className="profile-modal__username">
          Usuário <strong>{user.username}</strong>
        </p>
        {editing && <ChangePhoto onFile={(file) => void choosePhoto(file, setAvatarUrl, setError)} />}
        {error && <p className="profile-modal__error">{error}</p>}
      </div>
      {editing ? <EditActions saving={saving} onCancel={cancel} onSave={() => void save()} /> : <button type="button" className="profile-modal__text" onClick={startEdit}>Editar</button>}
    </div>
  )
}

function NameField({ value, onChange }: { value: string; onChange: (value: string) => void }): React.JSX.Element {
  return (
    <label>
      Nome
      <input value={value} maxLength={32} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function ChangePhoto({ onFile }: { onFile: (file: File | undefined) => void }): React.JSX.Element {
  return (
    <label className="profile-modal__file">
      Mudar foto
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} />
    </label>
  )
}

function EditActions({ saving, onCancel, onSave }: { saving: boolean; onCancel: () => void; onSave: () => void }): React.JSX.Element {
  return (
    <div className="profile-modal__actions account-profile__actions">
      <button type="button" onClick={onCancel}>
        Cancelar
      </button>
      <button type="button" className="profile-modal__save" disabled={saving} onClick={onSave}>
        Salvar
      </button>
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
): Promise<boolean> {
  if (!session) return false
  const parsed = profileUpdateSchema.safeParse({ displayName, avatarUrl })
  if (!parsed.success) {
    setError(parsed.error.issues.map((issue) => issue.message).join(' '))
    return false
  }
  setSaving(true)
  try {
    const updated = await session.api.updateProfile(parsed.data)
    updateUser(updated)
    applyChat((state) => withMemberProfile(state, { ...updated, online: true }))
    setError(null)
    setSaving(false)
    return true
  } catch (caught) {
    setError(caught instanceof Error ? caught.message : String(caught))
    setSaving(false)
    return false
  }
}
