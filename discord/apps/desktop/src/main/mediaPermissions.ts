import { desktopCapturer, session } from 'electron'

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
 * Sem este handler o `getDisplayMedia` falha no Electron. No protótipo compartilha
 * sempre o monitor principal; o seletor de janelas fica para a fase 4.
 * Exemplo: `handleScreenShareRequests()` dentro de `app.whenReady()`
 */
export function handleScreenShareRequests(): void {
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    const [primaryScreen] = await desktopCapturer.getSources({ types: ['screen'] })
    if (!primaryScreen) {
      callback({})
      return
    }
    callback(request.audioRequested ? { video: primaryScreen, audio: 'loopback' } : { video: primaryScreen })
  })
}
