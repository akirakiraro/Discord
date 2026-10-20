import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('radcord', {
  radminIp: (): Promise<string | null> => ipcRenderer.invoke('radcord:radmin-ip'),
})
