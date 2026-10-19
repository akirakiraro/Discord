import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { allowMediaPermissions, handleScreenShareRequests } from './mediaPermissions'

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
    webPreferences: { contextIsolation: true, sandbox: true },
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
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

app.whenReady().then(() => {
  allowMediaPermissions()
  handleScreenShareRequests()
  createMainWindow()
})

app.on('window-all-closed', () => app.quit())
