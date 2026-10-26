import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { ClientReportRequest } from '@radcord/shared'
import { parseUpdateSnapshot, type UpdateSnapshot } from '../shared/desktopUpdateSnapshot'
import { parseHostQuitPrompt, parseHostSnapshot, type HostQuitPrompt, type HostSnapshot, type HostStopPreview } from '../shared/hostSnapshot'

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
  hostStatus: (): Promise<HostSnapshot> => ipcRenderer.invoke('radcord:host-status').then(parseHostSnapshot),
  hostStart: (): Promise<HostSnapshot> => ipcRenderer.invoke('radcord:host-start').then(parseHostSnapshot),
  hostPreviewStop: (): Promise<HostStopPreview> => ipcRenderer.invoke('radcord:host-preview-stop'),
  hostStop: (): Promise<HostSnapshot> => ipcRenderer.invoke('radcord:host-stop', { confirmed: true }).then(parseHostSnapshot),
  hostFirewall: (): Promise<HostSnapshot> => ipcRenderer.invoke('radcord:host-firewall').then(parseHostSnapshot),
  hostOpenFirewall: (): Promise<HostSnapshot> => ipcRenderer.invoke('radcord:host-firewall-open').then(parseHostSnapshot),
  confirmHostQuit: (): Promise<HostSnapshot> => ipcRenderer.invoke('radcord:host-confirm-quit').then(parseHostSnapshot),
  dismissHostQuit: (): Promise<void> => ipcRenderer.invoke('radcord:host-dismiss-quit'),
  onHostState: (listener: (snapshot: HostSnapshot) => void): (() => void) => {
    const wrapped = (_event: IpcRendererEvent, snapshot: unknown): void => listener(parseHostSnapshot(snapshot))
    ipcRenderer.on('radcord:host-state', wrapped)
    return () => ipcRenderer.removeListener('radcord:host-state', wrapped)
  },
  onHostQuitPrompt: (listener: (prompt: HostQuitPrompt) => void): (() => void) => {
    const wrapped = (_event: IpcRendererEvent, payload: unknown): void => {
      const prompt = parseHostQuitPrompt(payload)
      if (prompt) listener(prompt)
    }
    ipcRenderer.on('radcord:host-quit-prompt', wrapped)
    return () => ipcRenderer.removeListener('radcord:host-quit-prompt', wrapped)
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
