import { contextBridge, ipcRenderer } from 'electron'
import type { ClientReportRequest } from '@radcord/shared'

contextBridge.exposeInMainWorld('radcord', {
  radminIp: (): Promise<string | null> => ipcRenderer.invoke('radcord:radmin-ip'),
  checkForUpdate: (): Promise<string> => ipcRenderer.invoke('radcord:check-update'),
  listScreenSources: (): Promise<ScreenSourceOption[]> => ipcRenderer.invoke('radcord:screen-sources'),
  chooseScreenSource: (sourceId: string): Promise<void> => ipcRenderer.invoke('radcord:screen-source-choice', sourceId),
  startScreenAudio: (): Promise<void> => ipcRenderer.invoke('radcord:screen-audio-start'),
  stopScreenAudio: (): Promise<void> => ipcRenderer.invoke('radcord:screen-audio-stop'),
  onScreenAudio: (listener: (pcm: Uint8Array) => void): void => {
    ipcRenderer.removeAllListeners('radcord:screen-audio-pcm')
    ipcRenderer.on('radcord:screen-audio-pcm', (_event, pcm: Uint8Array) => listener(pcm))
  },
  offScreenAudio: (): void => {
    ipcRenderer.removeAllListeners('radcord:screen-audio-pcm')
  },
  takeQueuedReports: (): Promise<ClientReportRequest[]> => ipcRenderer.invoke('radcord:take-reports'),
  saveQueuedReports: (reports: ClientReportRequest[]): Promise<void> => ipcRenderer.invoke('radcord:queue-reports', reports),
  onMainReport: (listener: (message: string) => void): void => {
    ipcRenderer.on('radcord:main-report', (_event, message: unknown) => {
      if (typeof message === 'string') listener(message)
    })
  },
})

interface ScreenSourceOption {
  id: string
  name: string
  kind: 'screen' | 'window'
  thumbnailUrl: string
}
