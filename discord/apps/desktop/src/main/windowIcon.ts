import { join } from 'node:path'

/**
 * PNG da janela. No pacote o electron-builder copia `build/icon.png` para
 * resources; no dev o arquivo fica ao lado do package.json.
 * Exemplo: `windowIconFile('C:/app/resources', 'C:/repo/apps/desktop', false)`
 */
export function windowIconFile(resourcesPath: string, appPath: string, packaged: boolean): string {
  const base = packaged ? resourcesPath : appPath
  const folder = base.trim()
  if (!folder) {
    const which = packaged ? 'resourcesPath' : 'appPath'
    throw new Error(`${which} vazio; esperado um diretório, recebido ${JSON.stringify(base)}`)
  }
  if (packaged) return join(folder, 'icon.png')
  return join(folder, 'build', 'icon.png')
}
