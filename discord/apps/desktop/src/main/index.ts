import { networkInterfaces } from 'node:os'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, screen, shell } from 'electron'
import { autoUpdater, type UpdateCheckResult } from 'electron-updater'
import { bindClientReports } from './clientReportBridge'
import { installBlockUpdate, type BlockUpdateClient } from './desktopUpdate'
import { allowMediaPermissions, handleScreenShareRequests } from './mediaPermissions'
import { findRadminIpv4 } from './radminAddress'
import { exposeScreenAudioIpc } from './screenAudioCapture'
import { exposeScreenAudioLog } from './screenAudioLog'
import { exposeScreenShareIpc } from './screenShareSources'
import { windowChrome } from './windowChrome'

// O Chromium troca os IPs locais por nomes mDNS ".local" nos candidatos WebRTC;
// pela LAN virtual do Radmin esses nomes não resolvem e a mídia pode não conectar.
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns')

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: windowChrome.backgroundColor,
    titleBarStyle: windowChrome.titleBarStyle,
    titleBarOverlay: windowChrome.titleBarOverlay,
    title: 'Radcord',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
    },
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  // Com titleBarOverlay, o maximizar no Windows passa da área de trabalho e cobre a barra de tarefas.
  window.on('maximize', () => snapToWorkArea(window))
  loadRenderer(window)
  return window
}

function snapToWorkArea(window: BrowserWindow): void {
  const area = screen.getDisplayMatching(window.getBounds()).workArea
  setTimeout(() => {
    if (window.isDestroyed() || !window.isMaximized()) return
    window.setBounds({ x: area.x, y: area.y, width: area.width, height: area.height })
  }, 0)
}

function loadRenderer(window: BrowserWindow): void {
  const devServerUrl = process.env.ELECTRON_RENDERER_URL
  if (devServerUrl) {
    void window.loadURL(devServerUrl)
    return
  }
  void window.loadFile(join(__dirname, '../renderer/index.html'))
}

function exposeRadminIp(): void {
  ipcMain.handle('radcord:radmin-ip', () => findRadminIpv4(networkInterfaces()))
}

function exposeDesktopUpdate(): void {
  ipcMain.handle('radcord:check-update', async () => {
    try {
      return await installBlockUpdate({
        packaged: app.isPackaged,
        confirm: confirmDesktopUpdate,
        client: blockUpdateClient(),
      })
    } catch (error: unknown) {
      dialog.showErrorBox('Atualização do Radcord', error instanceof Error ? error.message : String(error))
      return 'failed'
    }
  })
}

function blockUpdateClient(): BlockUpdateClient {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  return {
    setFeed(feed) {
      autoUpdater.setFeedURL(feed)
    },
    async checkForUpdates() {
      return availableVersion(await autoUpdater.checkForUpdates())
    },
    async downloadUpdate() {
      await autoUpdater.downloadUpdate()
    },
    quitAndInstall() {
      autoUpdater.quitAndInstall(false, true)
    },
  }
}

function availableVersion(result: UpdateCheckResult | null): { version: string } | null {
  if (!result?.isUpdateAvailable) return null
  return { version: result.updateInfo.version }
}

function confirmDesktopUpdate(version: string): Promise<boolean> {
  return dialog.showMessageBox({
    type: 'info',
    buttons: ['Agora não', 'Baixar e reiniciar'],
    defaultId: 1,
    cancelId: 0,
    title: 'Atualização do Radcord',
    message: `A versão ${version} está no host`,
    detail: 'O app baixa só a parte que mudou, fecha e abre de novo. Quem estiver na chamada cai nesse intervalo.',
  }).then((choice) => choice.response === 1)
}

app.whenReady().then(() => {
  allowMediaPermissions()
  handleScreenShareRequests()
  exposeRadminIp()
  exposeDesktopUpdate()
  exposeScreenShareIpc()
  exposeScreenAudioIpc()
  exposeScreenAudioLog()
  bindClientReports(createMainWindow(), join(app.getPath('userData'), 'pending-reports.json'))
})

app.on('window-all-closed', () => app.quit())
