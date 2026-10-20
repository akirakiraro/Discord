interface AuthFieldsProps {
  username: string
  onChange: (username: string) => void
}

export function AuthFields({ username, onChange }: AuthFieldsProps): React.JSX.Element {
  return (
    <label className="field">
      <span>Usuário</span>
      <input required value={username} placeholder="akira" onChange={(event) => onChange(event.target.value)} />
      <small className="field__hint">Letras, números, "_" ou "." (3 a 20)</small>
    </label>
  )
}
