import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('radcord', {
  radminIp: (): Promise<string | null> => ipcRenderer.invoke('radcord:radmin-ip'),
  listScreenSources: (): Promise<ScreenSourceOption[]> => ipcRenderer.invoke('radcord:screen-sources'),
  chooseScreenSource: (sourceId: string): Promise<void> => ipcRenderer.invoke('radcord:screen-source-choice', sourceId),
})

interface ScreenSourceOption {
  id: string
  name: string
  kind: 'screen' | 'window'
  thumbnailUrl: string
}
