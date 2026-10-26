import { networkInterfaces } from 'node:os'
import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, screen, shell, type BrowserWindowConstructorOptions } from 'electron'
import { autoUpdater, type UpdateCheckResult } from 'electron-updater'
import { bindClientReports } from './clientReportBridge'
import { DesktopUpdateMachine, armQuitAndInstall, type BlockUpdateClient } from './desktopUpdate'
import { cleanProgress, type UpdateProgress, type UpdateSnapshot } from '../shared/desktopUpdateSnapshot'
import { allowMediaPermissions, handleScreenShareRequests } from './mediaPermissions'
import { findRadminIpv4 } from './radminAddress'
import { exposeScreenAudioIpc } from './screenAudioCapture'
import { exposeScreenAudioLog } from './screenAudioLog'
import { exposeScreenShareIpc } from './screenShareSources'
import { APP_USER_MODEL_ID, PRODUCT_DISPLAY_NAME } from '../shared/appIdentity'
import { legacyUserDataPath } from './legacyUserData'
import { windowChrome } from './windowChrome'
import { windowIconFile } from './windowIcon'
import {
  DEFAULT_WINDOW_SIZE,
  launchPlacement,
  placementFromWindow,
  readWindowPlacement,
  rememberPlacement,
  writeWindowPlacement,
  type PlacementMemory,
  type WindowPlacement,
} from './windowPlacement'

// productName SoundRoom faria o Electron abrir outra pasta e a sessão sumiria.
app.setPath('userData', legacyUserDataPath(app.getPath('appData')))
// O atalho NSIS grava este id. Sem ele o Windows agrupa pelo nome do exe.
if (process.platform === 'win32') app.setAppUserModelId(APP_USER_MODEL_ID)

// O Chromium troca os IPs locais por nomes mDNS ".local" nos candidatos WebRTC;
// pela LAN virtual do Radmin esses nomes não resolvem e a mídia pode não conectar.
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns')

function createMainWindow(): BrowserWindow {
  const placementFile = join(app.getPath('userData'), 'window-placement.json')
  const saved = launchPlacement(readWindowPlacement(placementFile), workAreas())
  const window = new BrowserWindow(mainWindowOptions(saved))
  bindWindowNavigation(window)
  // Com titleBarOverlay, o maximizar no Windows passa da área de trabalho e cobre a barra de tarefas.
  window.on('maximize', () => snapToWorkArea(window))
  watchPlacement(window, placementFile, saved)
  revealWhenReady(window, saved)
  loadRenderer(window)
  return window
}

function mainWindowOptions(saved: WindowPlacement | null): BrowserWindowConstructorOptions {
  return {
    ...openingBounds(saved),
    minWidth: 900,
    minHeight: 560,
    show: false,
    backgroundColor: windowChrome.backgroundColor,
    titleBarStyle: windowChrome.titleBarStyle,
    titleBarOverlay: windowChrome.titleBarOverlay,
    title: PRODUCT_DISPLAY_NAME,
    icon: windowIconFile(process.resourcesPath, app.getAppPath(), app.isPackaged),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
    },
  }
}

function openingBounds(saved: WindowPlacement | null): { x?: number; y?: number; width: number; height: number } {
  if (!saved) return DEFAULT_WINDOW_SIZE
  return { x: saved.x, y: saved.y, width: saved.width, height: saved.height }
}

function workAreas() {
  return screen.getAllDisplays().map((display) => display.workArea)
}

function bindWindowNavigation(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
}

function revealWhenReady(window: BrowserWindow, saved: WindowPlacement | null): void {
  const reveal = () => revealWindow(window, saved)
  window.once('ready-to-show', reveal)
  window.webContents.on('did-fail-load', (_event, _code, _desc, _url, isMainFrame) => {
    if (isMainFrame) reveal()
  })
}

function revealWindow(window: BrowserWindow, saved: WindowPlacement | null): void {
  if (window.isDestroyed() || window.isVisible()) return
  if (saved?.fullscreen) window.setFullScreen(true)
  else if (saved?.maximized) window.maximize()
  window.show()
}

function watchPlacement(window: BrowserWindow, filePath: string, saved: WindowPlacement | null): void {
  const memory = rememberPlacement(saved ?? placementFromWindow(window))
  const save = () => writeWindowPlacement(filePath, memory.current())
  bindPlacementFlags(window, memory, save)
  bindPlacementBounds(window, memory, save)
}

function bindPlacementFlags(window: BrowserWindow, memory: PlacementMemory, save: () => void): void {
  window.on('maximize', () => { memory.noteMaximized(true); save() })
  window.on('enter-full-screen', () => { memory.noteFullscreen(true); save() })
  deferUntilAlive(window, 'unmaximize', () => noteRestored(window, memory, save, false))
  deferUntilAlive(window, 'leave-full-screen', () => noteRestored(window, memory, save, true))
}

function noteRestored(window: BrowserWindow, memory: PlacementMemory, save: () => void, fullscreen: boolean): void {
  if (fullscreen) memory.noteFullscreen(false)
  else if (!fillsWorkArea(window)) memory.noteMaximized(false)
  if (!memory.current().maximized && !memory.current().fullscreen) memory.noteBounds(window.getNormalBounds())
  save()
}

function fillsWorkArea(window: BrowserWindow): boolean {
  const bounds = window.getBounds()
  const area = screen.getDisplayMatching(bounds).workArea
  return Math.abs(bounds.x - area.x) <= 2
    && Math.abs(bounds.y - area.y) <= 2
    && Math.abs(bounds.width - area.width) <= 2
    && Math.abs(bounds.height - area.height) <= 2
}

function deferUntilAlive(window: BrowserWindow, event: 'unmaximize' | 'leave-full-screen', apply: () => void): void {
  const run = (): void => {
    setTimeout(() => {
      if (!window.isDestroyed()) apply()
    }, 100)
  }
  if (event === 'unmaximize') window.on('unmaximize', run)
  else window.on('leave-full-screen', run)
}

function bindPlacementBounds(window: BrowserWindow, memory: PlacementMemory, save: () => void): void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => storeRestoredBounds(window, memory, save), 200)
  }
  window.on('resize', schedule)
  window.on('move', schedule)
  window.on('close', () => {
    clearTimeout(timer)
    storeRestoredBounds(window, memory, save)
  })
}

function storeRestoredBounds(window: BrowserWindow, memory: PlacementMemory, save: () => void): void {
  if (window.isDestroyed()) return
  const maximized = memory.current().maximized || window.isMaximized()
  const fullscreen = memory.current().fullscreen || window.isFullScreen()
  memory.noteMaximized(maximized)
  memory.noteFullscreen(fullscreen)
  if (!maximized && !fullscreen) memory.noteBounds(window.getNormalBounds())
  save()
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
  const machine = new DesktopUpdateMachine({
    packaged: app.isPackaged,
    installedVersion: app.getVersion(),
    client: blockUpdateClient(),
    onChange: publishUpdateSnapshot,
  })
  registerUpdateIpc(machine)
  void machine.start()
}

function publishUpdateSnapshot(snapshot: UpdateSnapshot): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('radcord:update-state', snapshot)
  }
}

function registerUpdateIpc(machine: DesktopUpdateMachine): void {
  ipcMain.on('radcord:update-snapshot', (event) => {
    event.returnValue = machine.view()
  })
  ipcMain.handle('radcord:check-update', () => machine.requestCheck())
  ipcMain.handle('radcord:install-update', () => {
    machine.install()
  })
  ipcMain.handle('radcord:offer-update', (_event, version: unknown) => offerAnnouncedUpdate(machine, version))
}

function offerAnnouncedUpdate(machine: DesktopUpdateMachine, version: unknown): Promise<UpdateSnapshot> {
  if (typeof version !== 'string') return Promise.resolve(machine.view())
  return machine.announce(version)
}

function blockUpdateClient(): BlockUpdateClient {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  const listeners = bindUpdaterListeners()
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
      armQuitAndInstall(autoUpdater)
    },
    onDownloadProgress(listener) {
      listeners.onProgress = listener
    },
    onUpdateError(listener) {
      listeners.onError = listener
    },
    onUpdateDownloaded(listener) {
      listeners.onDownloaded = listener
    },
  }
}

function bindUpdaterListeners(): UpdaterListeners {
  const listeners: UpdaterListeners = { onProgress: null, onError: null, onDownloaded: null }
  autoUpdater.on('download-progress', (progress) => {
    listeners.onProgress?.(cleanProgress(progress))
  })
  autoUpdater.on('error', (error) => {
    listeners.onError?.(error instanceof Error ? error.message : String(error))
  })
  autoUpdater.on('update-downloaded', (info) => {
    listeners.onDownloaded?.(info.version)
  })
  return listeners
}

interface UpdaterListeners {
  onProgress: ((progress: UpdateProgress) => void) | null
  onError: ((message: string) => void) | null
  onDownloaded: ((version: string) => void) | null
}

function availableVersion(result: UpdateCheckResult | null): { version: string } | null {
  if (!result?.isUpdateAvailable) return null
  return { version: result.updateInfo.version }
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
