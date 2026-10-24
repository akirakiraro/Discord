import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { ClientReportRequest } from '@radcord/shared'
import { parseUpdateSnapshot, type UpdateSnapshot } from '../shared/desktopUpdateSnapshot'

contextBridge.exposeInMainWorld('radcord', {
  radminIp: (): Promise<string | null> => ipcRenderer.invoke('radcord:radmin-ip'),
  readUpdateState: (): UpdateSnapshot => parseUpdateSnapshot(ipcRenderer.sendSync('radcord:update-snapshot')),
  checkForUpdate: (): Promise<UpdateSnapshot> => ipcRenderer.invoke('radcord:check-update'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('radcord:install-update'),
  offerUpdate: (version: string): Promise<UpdateSnapshot> => ipcRenderer.invoke('radcord:offer-update', version),
  onUpdateState: (listener: (snapshot: UpdateSnapshot) => void): (() => void) => subscribeUpdateState(listener),
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
  logScreenAudio: (event: string, detail: Record<string, unknown>): void => {
    ipcRenderer.send('radcord:screen-audio-log', { event, detail })
  },
  takeQueuedReports: (): Promise<ClientReportRequest[]> => ipcRenderer.invoke('radcord:take-reports'),
  saveQueuedReports: (reports: ClientReportRequest[]): Promise<void> => ipcRenderer.invoke('radcord:queue-reports', reports),
  onMainReport: (listener: (message: string) => void): void => {
    ipcRenderer.on('radcord:main-report', (_event, message: unknown) => {
      if (typeof message === 'string') listener(message)
    })
  },
})

function subscribeUpdateState(listener: (snapshot: UpdateSnapshot) => void): () => void {
  const wrapped = (_event: IpcRendererEvent, snapshot: unknown): void => {
    listener(parseUpdateSnapshot(snapshot))
  }
  ipcRenderer.on('radcord:update-state', wrapped)
  listener(parseUpdateSnapshot(ipcRenderer.sendSync('radcord:update-snapshot')))
  return () => {
    ipcRenderer.removeListener('radcord:update-state', wrapped)
  }
}

interface ScreenSourceOption {
  id: string
  name: string
  kind: 'screen' | 'window'
  thumbnailUrl: string
}
