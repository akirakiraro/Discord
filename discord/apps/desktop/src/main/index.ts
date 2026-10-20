import { networkInterfaces } from 'node:os'
import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { allowMediaPermissions, handleScreenShareRequests } from './mediaPermissions'
import { findRadminIpv4 } from './radminAddress'

// O Chromium troca os IPs locais por nomes mDNS ".local" nos candidatos WebRTC;
// pela LAN virtual do Radmin esses nomes não resolvem e a mídia pode não conectar.
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns')

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: '#313338',
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
  loadRenderer(window)
  return window
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

app.whenReady().then(() => {
  allowMediaPermissions()
  handleScreenShareRequests()
  exposeRadminIp()
  createMainWindow()
})

app.on('window-all-closed', () => app.quit())
