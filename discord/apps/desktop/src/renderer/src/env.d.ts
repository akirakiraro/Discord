export {}

declare global {
  interface Window {
    radcord?: {
      radminIp(): Promise<string | null>
    }
  }
}
