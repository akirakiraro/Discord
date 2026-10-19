export interface SavedLogin {
  hostAddress: string
  username: string
  token: string | null
}

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = 'radcord.login'
const EMPTY_LOGIN: SavedLogin = { hostAddress: '', username: '', token: null }

/**
 * Último host, usuário e token de sessão, para reabrir o app já logado.
 * Exemplo: `const { token } = loadSavedLogin(window.localStorage)`
 */
export function loadSavedLogin(storage: KeyValueStorage): SavedLogin {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return EMPTY_LOGIN
  try {
    const parsed = JSON.parse(raw) as Partial<SavedLogin>
    return {
      hostAddress: parsed.hostAddress ?? '',
      username: parsed.username ?? '',
      token: typeof parsed.token === 'string' ? parsed.token : null,
    }
  } catch {
    return EMPTY_LOGIN
  }
}

/**
 * Exemplo: `saveLogin(window.localStorage, { hostAddress: '26.186.21.58', username: 'akira', token })`
 */
export function saveLogin(storage: KeyValueStorage, login: SavedLogin): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(login))
}

/** Esquece só o token: na próxima abertura o formulário já vem com host e usuário. */
export function forgetLoginToken(storage: KeyValueStorage): void {
  saveLogin(storage, { ...loadSavedLogin(storage), token: null })
}
