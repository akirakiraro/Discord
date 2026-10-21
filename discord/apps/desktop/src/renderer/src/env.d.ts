export {}

declare global {
  interface Window {
    radcord?: {
      radminIp(): Promise<string | null>
      checkForUpdate(): Promise<string>
      listScreenSources(): Promise<ScreenSourceOption[]>
      chooseScreenSource(sourceId: string): Promise<void>
    }
  }

  interface ScreenSourceOption {
    id: string
    name: string
    kind: 'screen' | 'window'
    thumbnailUrl: string
  }
}
