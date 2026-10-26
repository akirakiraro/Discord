import type { HostSpawnSpec, HostProcessHandle } from './hostLaunch'
import type { HostClock, HostProbe } from './hostProbe'

export interface HostEffects {
  readText(path: string): string | null
  exists(path: string): boolean
  writeText(path: string, text: string): void
  appendLog(path: string, text: string): void
  radminIp(): string | null
  probe(ip: string): Promise<HostProbe>
  spawn(spec: HostSpawnSpec): HostProcessHandle
  killTree(pid: number): Promise<void>
  firewallOutput(): Promise<string>
  elevateFirewall(scriptPath: string): Promise<{ code: number; output: string }>
  randomBytes(length: number): Uint8Array
}

export type { HostClock }
