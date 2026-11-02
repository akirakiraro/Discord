import type { HostQuitPrompt, HostSnapshot, HostStopPreview } from '../../shared/hostSnapshot'
import type { UpdateSnapshot } from '../../shared/desktopUpdateSnapshot'
import type { DevBotAction, DevBotAddRequest, DevBotView } from '../../shared/devBots'

export {}

declare global {
  interface Window {
    radcord?: {
      radminIp(): Promise<string | null>
      readUpdateState(): UpdateSnapshot
      checkForUpdate(): Promise<UpdateSnapshot>
      installUpdate(): Promise<void>
      offerUpdate(version: string): Promise<UpdateSnapshot>
      onUpdateState(listener: (snapshot: UpdateSnapshot) => void): () => void
      listScreenSources(): Promise<ScreenSourceOption[]>
      chooseScreenSource(sourceId: string): Promise<void>
      startScreenAudio(): Promise<void>
      stopScreenAudio(): Promise<void>
      onScreenAudio(listener: (pcm: Uint8Array) => void): void
      offScreenAudio(): void
      logScreenAudio(event: string, detail: Record<string, unknown>): void
      takeQueuedReports(): Promise<QueuedClientReport[]>
      saveQueuedReports(reports: QueuedClientReport[]): Promise<void>
      onMainReport(listener: (message: string) => void): void
      hostStatus(): Promise<HostSnapshot>
      hostStart(): Promise<HostSnapshot>
      hostPreviewStop(): Promise<HostStopPreview>
      hostStop(): Promise<HostSnapshot>
      hostFirewall(): Promise<HostSnapshot>
      hostOpenFirewall(): Promise<HostSnapshot>
      confirmHostQuit(): Promise<HostSnapshot>
      dismissHostQuit(): Promise<void>
      onHostState(listener: (snapshot: HostSnapshot) => void): () => void
      onHostQuitPrompt(listener: (prompt: HostQuitPrompt) => void): () => void
    }
  }

  interface Window {
    /** Só existe no `npm run desktop`. Ver `components/dev/DevBotsPanel.tsx`. */
    radcordDev?: {
      bots(): Promise<DevBotView[]>
      addBot(request: DevBotAddRequest): Promise<DevBotView[]>
      actOnBot(number: number, action: DevBotAction): Promise<DevBotView[]>
      pickWav(): Promise<string | null>
      onBots(listener: (bots: DevBotView[]) => void): () => void
    }
  }

  interface QueuedClientReport {
    source: 'main' | 'renderer'
    message: string
    detail?: string
  }

  interface ScreenSourceOption {
    id: string
    name: string
    kind: 'screen' | 'window'
    thumbnailUrl: string
  }
}
