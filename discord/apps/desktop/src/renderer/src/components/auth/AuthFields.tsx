import type { AuthForm, AuthMode } from '../../lib/auth/authenticate'

interface AuthFieldsProps {
  form: AuthForm
  mode: AuthMode
  onChange: (form: AuthForm) => void
}

interface TextFieldProps {
  label: string
  value: string
  placeholder?: string
  type?: 'text' | 'password'
  hint?: string
  onChange: (value: string) => void
}

function TextField({ label, value, placeholder, type = 'text', hint, onChange }: TextFieldProps): React.JSX.Element {
  return (
    <label className="field">
      <span>{label}</span>
      <input required type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {hint && <small className="field__hint">{hint}</small>}
    </label>
  )
}

export function AuthFields({ form, mode, onChange }: AuthFieldsProps): React.JSX.Element {
  const update = (patch: Partial<AuthForm>): void => onChange({ ...form, ...patch })

  return (
    <>
      <TextField
        label="IP do host no Radmin"
        placeholder="26.186.21.58"
        value={form.hostAddress}
        onChange={(hostAddress) => update({ hostAddress })}
      />
      <TextField
        label="Usuário"
        placeholder="akira"
        value={form.username}
        hint={mode === 'register' ? 'Letras, números, "_" ou "." (3 a 20)' : undefined}
        onChange={(username) => update({ username })}
      />
      {mode === 'register' && (
        <TextField
          label="Nome de exibição"
          placeholder="Akira"
          value={form.displayName}
          onChange={(displayName) => update({ displayName })}
        />
      )}
      <TextField label="Senha" type="password" value={form.password} onChange={(password) => update({ password })} />
    </>
  )
}
