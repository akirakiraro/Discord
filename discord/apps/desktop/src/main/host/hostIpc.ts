import { BrowserWindow, ipcMain } from 'electron'
import { parseConfirmedFlag, type HostQuitPrompt, type HostSnapshot } from '../../shared/hostSnapshot'
import type { AppClosePlan } from './hostClose'
import type { HostController } from './hostController'

/**
 * Canais do preload. O renderer não cria processo.
 * Exemplo: `bindHostIpc(controller, publish, () => machine.reconsiderInstall())`.
 */
export function bindHostIpc(controller: HostController, publish: (snapshot: HostSnapshot) => void, onHostOff: () => void): void {
  controller.setListener(publish)
  ipcMain.handle('radcord:host-status', () => controller.refresh())
  ipcMain.handle('radcord:host-start', () => controller.start())
  ipcMain.handle('radcord:host-preview-stop', () => controller.previewStop())
  ipcMain.handle('radcord:host-stop', async (_event, body: unknown) => stopIfConfirmed(controller, body, onHostOff))
  ipcMain.handle('radcord:host-firewall', () => controller.checkFirewall())
  ipcMain.handle('radcord:host-firewall-open', () => controller.openFirewall())
}

/**
 * Fechar a janela desliga o host que este app subiu. Com gente na call, a tela confirma.
 * Exemplo: `bindHostWindow(window, controller, publish, onHostOff)`.
 */
export function bindHostWindow(
  window: BrowserWindow,
  controller: HostController,
  publish: (snapshot: HostSnapshot) => void,
  onHostOff: () => void,
): void {
  let allowClose = false
  let deciding = false
  window.on('close', (event) => {
    if (allowClose || !controller.ownsRunning()) return
    event.preventDefault()
    if (deciding) return
    deciding = true
    void decideClose(window, controller, publish, onHostOff, () => {
      allowClose = true
    }, () => {
      deciding = false
    })
  })
  ipcMain.handle('radcord:host-confirm-quit', async () => {
    const snapshot = await controller.stop()
    publish(snapshot)
    if (snapshot.phase === 'off') onHostOff()
    if (snapshot.phase === 'off' && !window.isDestroyed()) {
      allowClose = true
      window.close()
    }
    return snapshot
  })
  ipcMain.handle('radcord:host-dismiss-quit', () => {
    deciding = false
  })
}

export function publishHostSnapshot(snapshot: HostSnapshot): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('radcord:host-state', snapshot)
  }
}

async function stopIfConfirmed(controller: HostController, body: unknown, onHostOff: () => void): Promise<HostSnapshot> {
  if (parseConfirmedFlag(body) !== true) return controller.view()
  const snapshot = await controller.stop()
  if (snapshot.phase === 'off') onHostOff()
  return snapshot
}

async function decideClose(
  window: BrowserWindow,
  controller: HostController,
  publish: (snapshot: HostSnapshot) => void,
  onHostOff: () => void,
  allow: () => void,
  release: () => void,
): Promise<void> {
  const plan = await controller.prepareClose()
  if (plan.kind === 'quit') {
    allow()
    if (!window.isDestroyed()) window.close()
    return
  }
  if (plan.kind === 'stop-then-quit') {
    const snapshot = await controller.stop()
    publish(snapshot)
    if (snapshot.phase === 'off') onHostOff()
    if (snapshot.phase === 'off') {
      allow()
      if (!window.isDestroyed()) window.close()
      return
    }
    release()
    return
  }
  release()
  if (!window.isDestroyed()) window.webContents.send('radcord:host-quit-prompt', quitPrompt(plan))
}

function quitPrompt(plan: Extract<AppClosePlan, { kind: 'confirm' }>): HostQuitPrompt {
  return { online: plan.online, inVoice: plan.inVoice, message: plan.message }
}
