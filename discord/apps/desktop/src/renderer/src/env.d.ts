export {}

declare global {
  interface Window {
    radcord?: {
      radminIp(): Promise<string | null>
      checkForUpdate(): Promise<string>
      listScreenSources(): Promise<ScreenSourceOption[]>
      chooseScreenSource(sourceId: string): Promise<void>
      takeQueuedReports(): Promise<QueuedClientReport[]>
      saveQueuedReports(reports: QueuedClientReport[]): Promise<void>
      onMainReport(listener: (message: string) => void): void
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
