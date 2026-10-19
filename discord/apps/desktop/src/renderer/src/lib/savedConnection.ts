export interface SavedConnection {
  hostAddress: string
  displayName: string
}

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = 'radcord.connection'
const EMPTY_CONNECTION: SavedConnection = { hostAddress: '', displayName: '' }

/**
 * Lê o último host e apelido usados, para não precisar digitar toda vez.
 * Exemplo: `loadSavedConnection(window.localStorage).hostAddress`
 */
export function loadSavedConnection(storage: KeyValueStorage): SavedConnection {
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return EMPTY_CONNECTION
  try {
    const parsed = JSON.parse(raw) as Partial<SavedConnection>
    return { hostAddress: parsed.hostAddress ?? '', displayName: parsed.displayName ?? '' }
  } catch {
    return EMPTY_CONNECTION
  }
}

/**
 * Guarda o host e o apelido da última conexão bem-sucedida.
 * Exemplo: `saveConnection(window.localStorage, { hostAddress: '26.186.21.58', displayName: 'Akira' })`
 */
export function saveConnection(storage: KeyValueStorage, connection: SavedConnection): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(connection))
}
