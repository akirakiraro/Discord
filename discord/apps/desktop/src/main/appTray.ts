import { app, BrowserWindow, Menu, nativeImage, Notification, Tray } from 'electron'
import { TRAY_MENU, TRAY_NOTICE, type CloseGate } from './closeToTray'

export interface AppTray {
  available: boolean
  notifyMinimized(): void
}

/**
 * Ícone na bandeja. Clique abre a janela; Sair pede a saída de verdade.
 * Exemplo: `createAppTray(iconFile, () => showWindow(window), () => app.quit())`
 */
export function createAppTray(iconFile: string, onOpen: () => void, onQuit: () => void): AppTray {
  const image = nativeImage.createFromPath(iconFile)
  if (image.isEmpty()) return { available: false, notifyMinimized: () => undefined }
  const tray = new Tray(image.resize({ width: 16, height: 16 }))
  tray.setToolTip(TRAY_MENU.tooltip)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: TRAY_MENU.open, click: onOpen },
    { type: 'separator' },
    { label: TRAY_MENU.quit, click: onQuit },
  ]))
  tray.on('click', onOpen)
  return { available: true, notifyMinimized: () => showNotice(tray, image) }
}

function showNotice(tray: Tray, image: Electron.NativeImage): void {
  if (process.platform === 'win32') {
    tray.displayBalloon({ iconType: 'custom', icon: image, title: TRAY_NOTICE.title, content: TRAY_NOTICE.content })
    return
  }
  if (Notification.isSupported()) new Notification({ title: TRAY_NOTICE.title, body: TRAY_NOTICE.content }).show()
}

/**
 * X esconde a janela e avisa. Saída pedida deixa o close seguir.
 * Exemplo: `bindCloseToTray(window, gate, tray)`
 */
export function bindCloseToTray(window: BrowserWindow, gate: CloseGate, tray: AppTray): void {
  window.on('close', (event) => {
    if (!gate.shouldHideOnClose()) return
    event.preventDefault()
    window.hide()
    tray.notifyMinimized()
  })
  window.on('session-end', () => gate.requestQuit())
}

/** Traz a janela de volta do esconderijo. Exemplo: `showMainWindow(window)` */
export function showMainWindow(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

/** Todo `app.quit()` (menu, atualização) vira pedido de saída. Exemplo: `bindQuitIntent(gate)` */
export function bindQuitIntent(gate: CloseGate): void {
  app.on('before-quit', () => gate.requestQuit())
}
