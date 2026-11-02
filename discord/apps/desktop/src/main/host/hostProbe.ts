import { connect } from 'node:net'
import { API_PORT, LIVEKIT_PORT, apiWithoutLiveKitMessage, liveKitWithoutApiMessage, portBusyMessage } from './hostMessages'

export interface HostProbe {
  healthOk: boolean
  apiOpen: boolean
  livekitOpen: boolean
  online: number
  inVoice: number
}

export interface HostClock {
  now(): number
  sleep(ms: number): Promise<void>
}

/**
 * TCP aceitou conexão. Exemplo: `await tcpAccepts('127.0.0.1', 7880, 500)`.
 */
export function tcpAccepts(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port })
    const done = (ok: boolean): void => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

/**
 * Corpo do GET /health. Exemplo: `parseHealthBody({ status: 'ok', online: 2, inVoice: 1 })`.
 */
export function parseHealthBody(body: unknown): { online: number; inVoice: number } | null {
  if (!body || typeof body !== 'object') return null
  const record = body as { status?: unknown; online?: unknown; inVoice?: unknown }
  if (record.status !== 'ok') return null
  if (!isCount(record.online) || !isCount(record.inVoice)) return null
  return { online: record.online, inVoice: record.inVoice }
}

/**
 * Antes de subir: null quer dizer que as portas estão livres.
 * Exemplo: `describePortConflict({ healthOk: true, apiOpen: true, livekitOpen: false, online: 0, inVoice: 0 })`.
 */
export function describePortConflict(probe: HostProbe): string | null {
  if (probe.healthOk && probe.livekitOpen) return null
  if (probe.healthOk && !probe.livekitOpen) return apiWithoutLiveKitMessage()
  if (probe.livekitOpen && probe.apiOpen) return liveKitWithoutApiMessage()
  if (probe.livekitOpen) return portBusyMessage(LIVEKIT_PORT)
  if (probe.apiOpen) return portBusyMessage(API_PORT)
  return null
}

export function portsAreUp(probe: HostProbe): boolean {
  return probe.healthOk && probe.livekitOpen
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}
