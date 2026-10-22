import { session } from 'electron'
import { findChosenSource } from './screenShareSources'

const ALLOWED_PERMISSIONS = new Set(['media', 'display-capture'])

/**
 * Libera microfone, câmera e captura de tela sem prompt: o app só carrega conteúdo local.
 * Exemplo: `allowMediaPermissions()` dentro de `app.whenReady()`
 */
export function allowMediaPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission))
  })
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) =>
    ALLOWED_PERMISSIONS.has(permission),
  )
}

/**
 * Sem este handler o `getDisplayMedia` falha no Electron. Usa a fonte escolhida no
 * seletor. O áudio não vem do loopback do sistema: o helper captura só o processo da janela
 * ou os processos daquele monitor.
 * Exemplo: `handleScreenShareRequests()` dentro de `app.whenReady()`
 */
export function handleScreenShareRequests(): void {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const chosen = await findChosenSource()
    if (!chosen) {
      callback({})
      return
    }
    callback({ video: chosen })
  })
}
