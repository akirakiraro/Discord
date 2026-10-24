import { join } from 'node:path'
import { LEGACY_USER_DATA_DIRECTORY } from '../shared/appIdentity'

/**
 * Sessão anterior ao nome SoundRoom. O Electron usaria %APPDATA%\SoundRoom
 * e a pessoa perderia login e preferências.
 * Exemplo: `legacyUserDataPath('C:/Users/akira/AppData/Roaming')`
 */
export function legacyUserDataPath(appDataDir: string): string {
  const trimmed = appDataDir.trim()
  if (!trimmed) {
    throw new Error(`appData vazio; esperado um diretório, recebido ${JSON.stringify(appDataDir)}`)
  }
  return join(trimmed, LEGACY_USER_DATA_DIRECTORY)
}
