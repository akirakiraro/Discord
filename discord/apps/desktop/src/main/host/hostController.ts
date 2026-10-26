import { HOST_UNAVAILABLE, type HostSnapshot, type HostStopPreview } from '../../shared/hostSnapshot'
import { hostBlocksInstall, planAppClose, type AppClosePlan } from './hostClose'
import type { HostClock, HostEffects } from './hostEffects'
import {
  apiEnvironment,
  apiSpawn,
  ensureLiveKitSecret,
  liveKitConfigPath,
  liveKitSecretPath,
  liveKitSpawn,
  liveKitYaml,
} from './hostLaunch'
import { logTail } from './hostLog'
import { HOST_ERROR, explainHostExit, firewallElevationFailure, readError, stopWarning } from './hostMessages'
import { findReadyModule, hostLogPaths, type HostModule } from './hostModule'
import { describePortConflict, portsAreUp, type HostProbe } from './hostProbe'
import { waitForHostReady, waitForPortsClosed } from './hostWait'
import { firewallRulesPresent } from './hostFirewallPlan'

const IDLE_PROBE: HostProbe = { healthOk: false, apiOpen: false, livekitOpen: false, online: 0, inVoice: 0 }

/**
 * Liga e desliga o host no processo principal. O renderer só pede e lê o snapshot.
 * Exemplo: `await controller.start()`.
 */
export class HostController {
  private snapshot: HostSnapshot = HOST_UNAVAILABLE
  private module: HostModule | null = null
  private livekitPid: number | null = null
  private apiPid: number | null = null
  private livekitExit: (() => { code: number } | null) | null = null
  private apiExit: (() => { code: number } | null) | null = null
  private busy = false
  private cancelled = false
  private operation: Promise<void> = Promise.resolve()
  private releaseOperation = (): void => undefined
  private listener: ((snapshot: HostSnapshot) => void) | null = null

  constructor(private readonly options: { candidates: readonly string[]; effects: HostEffects; clock: HostClock }) {}

  view(): HostSnapshot {
    return this.snapshot
  }

  /** O processo principal republica o snapshot e solta a atualização quando o host cai. */
  setListener(listener: (snapshot: HostSnapshot) => void): void {
    this.listener = listener
  }

  ownsRunning(): boolean {
    return hostBlocksInstall(this.snapshot) && this.snapshot.phase !== 'stopping'
  }

  async refresh(): Promise<HostSnapshot> {
    if (this.busy) return this.snapshot
    this.busy = true
    try {
      return await this.refreshLocked()
    } finally {
      this.busy = false
    }
  }

  async start(): Promise<HostSnapshot> {
    if (this.busy) return this.snapshot
    if (this.snapshot.phase === 'on' || this.snapshot.phase === 'starting' || this.snapshot.phase === 'external') return this.snapshot
    this.busy = true
    this.armOperation()
    try {
      return await this.startLocked()
    } finally {
      this.busy = false
      this.releaseOperation()
    }
  }

  /**
   * Não desliga. Devolve a frase e a contagem para o diálogo.
   * Exemplo: `const preview = await controller.previewStop()`.
   */
  async previewStop(): Promise<HostStopPreview> {
    if (this.busy) {
      return { allowed: false, online: this.snapshot.online, inVoice: this.snapshot.inVoice, message: 'O host ainda está mudando de estado.' }
    }
    if (!this.snapshot.ownedByApp || (this.snapshot.phase !== 'on' && this.snapshot.phase !== 'starting' && this.snapshot.phase !== 'error')) {
      const message = this.snapshot.phase === 'external' ? HOST_ERROR.externalStop : HOST_ERROR.alreadyOff
      return { allowed: false, online: this.snapshot.online, inVoice: this.snapshot.inVoice, message }
    }
    await this.refreshCounts()
    return {
      allowed: true,
      online: this.snapshot.online,
      inVoice: this.snapshot.inVoice,
      message: stopWarning(this.snapshot.online, this.snapshot.inVoice),
    }
  }

  async stop(): Promise<HostSnapshot> {
    if (!this.snapshot.ownedByApp && this.apiPid === null && this.livekitPid === null) {
      return this.publish({ ...this.snapshot, message: this.snapshot.phase === 'external' ? HOST_ERROR.externalStop : HOST_ERROR.alreadyOff })
    }
    if (this.busy && (this.snapshot.phase === 'starting' || this.apiPid !== null || this.livekitPid !== null)) {
      this.cancelled = true
      await this.killOwned()
      await this.operation
      return this.snapshot
    }
    if (this.busy) return this.snapshot
    this.busy = true
    this.armOperation()
    try {
      return await this.stopLocked()
    } finally {
      this.busy = false
      this.releaseOperation()
    }
  }

  /**
   * Decisão ao fechar a janela, com a contagem atualizada.
   * Exemplo: `const plan = await controller.prepareClose()`.
   */
  async prepareClose(): Promise<AppClosePlan> {
    if (this.snapshot.ownedByApp && (this.snapshot.phase === 'on' || this.snapshot.phase === 'starting')) await this.refreshCounts()
    return planAppClose(this.snapshot)
  }

  async checkFirewall(): Promise<HostSnapshot> {
    const output = await this.readFirewall()
    if (output === null) return this.snapshot
    return this.publishFirewall(firewallRulesPresent(output), firewallRulesPresent(output) ? HOST_ERROR.firewallOk : HOST_ERROR.firewallMissing)
  }

  async openFirewall(): Promise<HostSnapshot> {
    const module = this.loadModule()
    if (!module) return this.snapshot
    let result: { code: number; output: string }
    try {
      result = await this.options.effects.elevateFirewall(module.firewallScript)
    } catch (error: unknown) {
      result = { code: 1, output: readError(error) }
    }
    if (result.code !== 0) return this.publishFirewall(false, firewallElevationFailure(result.code, result.output))
    const output = await this.readFirewall()
    const present = output !== null && firewallRulesPresent(output)
    return this.publishFirewall(present, present ? HOST_ERROR.firewallOk : HOST_ERROR.firewallRanWithoutRules)
  }

  private async refreshLocked(): Promise<HostSnapshot> {
    const module = this.loadModule()
    if (!module) return this.publish({ ...HOST_UNAVAILABLE })
    const logs = this.logsOf(module)
    const ip = this.options.effects.radminIp() ?? this.snapshot.radminIp
    if (!ip) return this.publish(this.withoutIp(logs))
    const probe = await this.safeProbe(ip)
    if (portsAreUp(probe)) return this.publish(this.upSnapshot(ip, probe, logs))
    if (this.snapshot.ownedByApp && this.snapshot.phase === 'on') {
      return this.publish({ ...this.base(logs), phase: 'error', ownedByApp: true, radminIp: ip, message: HOST_ERROR.fell, online: 0, inVoice: 0 })
    }
    if (this.snapshot.phase === 'error') {
      return this.publish({ ...this.base(logs), phase: 'error', ownedByApp: false, radminIp: ip, message: this.snapshot.message, online: 0, inVoice: 0 })
    }
    return this.publish({ ...this.base(logs), phase: 'off', ownedByApp: false, radminIp: ip, message: null, online: 0, inVoice: 0 })
  }

  private async startLocked(): Promise<HostSnapshot> {
    const module = this.loadModule()
    if (!module) return this.publish({ ...HOST_UNAVAILABLE })
    const missing = this.missingTool(module)
    if (missing) return this.fail(missing)
    const ip = this.options.effects.radminIp()
    if (!ip) return this.fail(HOST_ERROR.noRadmin)
    const probe = await this.safeProbe(ip)
    if (portsAreUp(probe)) {
      return this.publish({ ...this.base(this.logsOf(module)), phase: 'external', ownedByApp: false, radminIp: ip, message: HOST_ERROR.externalStop, online: probe.online, inVoice: probe.inVoice })
    }
    const conflict = describePortConflict(probe)
    if (conflict) return this.fail(conflict)
    this.cancelled = false
    try {
      this.writeConfig(module, ip)
    } catch (error: unknown) {
      return this.fail(readError(error))
    }
    this.publish({ ...this.base(this.logsOf(module)), phase: 'starting', ownedByApp: false, radminIp: ip, message: null, online: 0, inVoice: 0 })
    const spawned = this.spawnBoth(module, ip)
    if (spawned) {
      await this.killOwned()
      return this.fail(spawned)
    }
    this.publish({ ...this.snapshot, phase: 'starting', ownedByApp: true })
    const ready = await waitForHostReady({
      clock: this.options.clock,
      livekit: { pid: this.livekitPid ?? -1, exited: () => this.livekitExit?.() ?? null },
      api: { pid: this.apiPid ?? -1, exited: () => this.apiExit?.() ?? null },
      probe: () => this.safeProbe(ip),
    })
    if (this.cancelled) return this.finishStop(module)
    if (!ready.ok) {
      await this.killOwned()
      if (this.cancelled) return this.finishStop(module)
      const message = ready.reason === 'timeout' ? HOST_ERROR.timeout : this.exitMessage(module, ready)
      return this.fail(message)
    }
    return this.publish({ ...this.base(this.logsOf(module)), phase: 'on', ownedByApp: true, radminIp: ip, message: null, online: ready.online, inVoice: ready.inVoice })
  }

  private async stopLocked(): Promise<HostSnapshot> {
    return this.finishStop(this.module)
  }

  private async finishStop(module: HostModule | null): Promise<HostSnapshot> {
    this.publish({ ...this.snapshot, phase: 'stopping' })
    await this.killOwned()
    const ip = this.snapshot.radminIp
    const free = ip ? await waitForPortsClosed({ clock: this.options.clock, probe: () => this.safeProbe(ip) }) : true
    const logs = module ? this.logsOf(module) : { apiLog: this.snapshot.apiLog, livekitLog: this.snapshot.livekitLog }
    this.cancelled = false
    if (!free) {
      return this.publish({ ...this.snapshot, ...logs, phase: 'error', ownedByApp: false, message: HOST_ERROR.portsStuck, online: 0, inVoice: 0 })
    }
    return this.publish({ ...this.snapshot, ...logs, phase: 'off', ownedByApp: false, message: null, online: 0, inVoice: 0 })
  }

  private spawnBoth(module: HostModule, ip: string): string | null {
    const secret = this.options.effects.readText(liveKitSecretPath(module))?.trim() ?? ''
    const env = apiEnvironment(ip, secret, module.databasePath)
    const logs = hostLogPaths(module)
    try {
      this.options.effects.appendLog(logs.livekit, `ligando LiveKit em ${ip}\n`)
      const livekit = this.options.effects.spawn({ ...liveKitSpawn(module, liveKitConfigPath(module)), logPath: logs.livekit })
      this.livekitPid = livekit.pid
      this.livekitExit = () => livekit.exited()
      this.options.effects.appendLog(logs.api, `ligando API em ${ip}\n`)
      const api = this.options.effects.spawn({ ...apiSpawn(module, env), logPath: logs.api })
      this.apiPid = api.pid
      this.apiExit = () => api.exited()
      return null
    } catch (error: unknown) {
      return readError(error)
    }
  }

  private writeConfig(module: HostModule, ip: string): void {
    const secret = ensureLiveKitSecret(this.options.effects.readText(liveKitSecretPath(module)), () => this.options.effects.randomBytes(36))
    this.options.effects.writeText(liveKitSecretPath(module), secret)
    this.options.effects.writeText(liveKitConfigPath(module), liveKitYaml(ip, secret))
  }

  private async killOwned(): Promise<void> {
    const pids = [this.apiPid, this.livekitPid].filter((pid): pid is number => pid !== null && pid > 0)
    this.apiPid = null
    this.livekitPid = null
    const stopped = (): { code: number } => ({ code: 0 })
    if (this.apiExit) this.apiExit = stopped
    if (this.livekitExit) this.livekitExit = stopped
    for (const pid of pids) await this.options.effects.killTree(pid)
  }

  private armOperation(): void {
    this.operation = new Promise((resolve) => {
      this.releaseOperation = resolve
    })
  }

  private async refreshCounts(): Promise<void> {
    const ip = this.snapshot.radminIp
    if (!ip) return
    const probe = await this.safeProbe(ip)
    if (!probe.healthOk) return
    this.publish({ ...this.snapshot, online: probe.online, inVoice: probe.inVoice })
  }

  private async safeProbe(ip: string): Promise<HostProbe> {
    try {
      return await this.options.effects.probe(ip)
    } catch {
      return IDLE_PROBE
    }
  }

  private loadModule(): HostModule | null {
    const found = findReadyModule(this.options.candidates, (path) => this.options.effects.readText(path), (path) => this.options.effects.exists(path))
    this.module = found?.module ?? null
    return this.module
  }

  private missingTool(module: HostModule): string | null {
    if (!this.options.effects.exists(module.nodeExe)) return HOST_ERROR.noNode
    if (!this.options.effects.exists(module.livekitExe)) return HOST_ERROR.noLivekit
    if (!this.options.effects.exists(module.tsxLoader)) return HOST_ERROR.noTsx
    return null
  }

  private fail(message: string): HostSnapshot {
    const module = this.module
    this.livekitPid = null
    this.apiPid = null
    const logs = module ? this.logsOf(module) : { apiLog: [], livekitLog: [] }
    return this.publish({ ...this.base(logs), phase: 'error', ownedByApp: false, radminIp: this.options.effects.radminIp(), message, online: 0, inVoice: 0 })
  }

  private withoutIp(logs: { apiLog: string[]; livekitLog: string[] }): HostSnapshot {
    if (this.snapshot.ownedByApp && this.snapshot.phase === 'on') return { ...this.snapshot, ...logs, moduleReady: true }
    return { ...this.base(logs), phase: 'off', ownedByApp: false, radminIp: null, message: null, online: 0, inVoice: 0 }
  }

  private upSnapshot(ip: string, probe: HostProbe, logs: { apiLog: string[]; livekitLog: string[] }): HostSnapshot {
    const owned = this.snapshot.ownedByApp
    return {
      ...this.base(logs),
      phase: owned ? 'on' : 'external',
      ownedByApp: owned,
      radminIp: ip,
      message: owned ? null : HOST_ERROR.externalStop,
      online: probe.online,
      inVoice: probe.inVoice,
    }
  }

  private exitMessage(module: HostModule, ready: { reason: 'livekit-exit' | 'api-exit'; code: number }): string {
    const name = ready.reason === 'livekit-exit' ? 'LiveKit' : 'API'
    const log = this.options.effects.readText(hostLogPaths(module)[name === 'API' ? 'api' : 'livekit']) ?? ''
    return explainHostExit(name, ready.code, log)
  }

  private logsOf(module: HostModule): { apiLog: string[]; livekitLog: string[] } {
    const paths = hostLogPaths(module)
    return {
      apiLog: logTail(this.options.effects.readText(paths.api) ?? ''),
      livekitLog: logTail(this.options.effects.readText(paths.livekit) ?? ''),
    }
  }

  private base(logs: { apiLog: string[]; livekitLog: string[] }): HostSnapshot {
    return { ...this.snapshot, ...logs, moduleReady: true, firewall: this.snapshot.firewall }
  }

  private publishFirewall(present: boolean, message: string): HostSnapshot {
    return this.publish({ ...this.snapshot, firewall: present ? 'ok' : 'missing', message })
  }

  private async readFirewall(): Promise<string | null> {
    try {
      return await this.options.effects.firewallOutput()
    } catch (error: unknown) {
      this.publish({ ...this.snapshot, firewall: 'unknown', message: readError(error) })
      return null
    }
  }

  private publish(next: HostSnapshot): HostSnapshot {
    this.snapshot = next
    this.listener?.(next)
    return next
  }
}
