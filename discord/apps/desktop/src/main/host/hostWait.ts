import type { HostProcessHandle } from './hostLaunch'
import { HOST_POLL_MS, HOST_START_TIMEOUT_MS, HOST_STOP_TIMEOUT_MS } from './hostMessages'
import type { HostClock, HostProbe } from './hostProbe'

export type ReadyWait =
  | { ok: true; online: number; inVoice: number }
  | { ok: false; reason: 'timeout' }
  | { ok: false; reason: 'livekit-exit'; code: number }
  | { ok: false; reason: 'api-exit'; code: number }

/**
 * Espera /health e a porta 7880, ou o processo cair, até 20 s.
 * Exemplo: `await waitForHostReady({ clock, livekit, api, probe })`.
 */
export async function waitForHostReady(input: {
  clock: HostClock
  livekit: HostProcessHandle
  api: HostProcessHandle
  probe: () => Promise<HostProbe>
  timeoutMs?: number
  pollMs?: number
}): Promise<ReadyWait> {
  const timeoutMs = input.timeoutMs ?? HOST_START_TIMEOUT_MS
  const pollMs = input.pollMs ?? HOST_POLL_MS
  const deadline = input.clock.now() + timeoutMs
  while (input.clock.now() < deadline) {
    const livekitExit = input.livekit.exited()
    if (livekitExit) return { ok: false, reason: 'livekit-exit', code: livekitExit.code }
    const apiExit = input.api.exited()
    if (apiExit) return { ok: false, reason: 'api-exit', code: apiExit.code }
    const probe = await input.probe()
    if (probe.healthOk && probe.livekitOpen) return { ok: true, online: probe.online, inVoice: probe.inVoice }
    await input.clock.sleep(pollMs)
  }
  return { ok: false, reason: 'timeout' }
}

/**
 * Depois do taskkill, as portas 3000 e 7880 precisam fechar. Exemplo: `await waitForPortsClosed(...)`.
 */
export async function waitForPortsClosed(input: {
  clock: HostClock
  probe: () => Promise<HostProbe>
  timeoutMs?: number
  pollMs?: number
}): Promise<boolean> {
  const timeoutMs = input.timeoutMs ?? HOST_STOP_TIMEOUT_MS
  const pollMs = input.pollMs ?? HOST_POLL_MS
  const deadline = input.clock.now() + timeoutMs
  while (input.clock.now() < deadline) {
    const probe = await input.probe()
    if (!probe.apiOpen && !probe.livekitOpen) return true
    await input.clock.sleep(pollMs)
  }
  return false
}
