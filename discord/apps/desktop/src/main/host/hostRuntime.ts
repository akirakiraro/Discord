import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { dirname } from 'node:path'
import { findRadminIpv4 } from '../radminAddress'
import { HostController } from './hostController'
import type { HostEffects } from './hostEffects'
import { firewallElevationCommand, firewallQueryCommand } from './hostFirewallPlan'
import { killTreeCommand, type HostProcessHandle, type HostSpawnSpec } from './hostLaunch'
import { appendCappedLog, type LogFiles } from './hostLog'
import { API_PORT, LIVEKIT_PORT } from './hostMessages'
import { hostModuleCandidates } from './hostModule'
import { parseHealthBody, tcpAccepts, type HostProbe } from './hostProbe'

const disk: LogFiles = {
  size(path) {
    try {
      return statSync(path).size
    } catch {
      return 0
    }
  },
  rename(from, to) {
    renameSync(from, to)
  },
  append(path, text) {
    mkdirSync(dirname(path), { recursive: true })
    appendFileSync(path, text)
  },
}

/**
 * Efeitos de verdade: disco, portas, `node` e `taskkill`. Os testes usam um fake.
 * Exemplo: `createHostController({ userDataDir, appPath, cwd, envPath })`.
 */
export function createHostController(input: {
  userDataDir: string
  appPath: string
  cwd: string
  envPath: string | undefined
  extraApiEnv?: Readonly<Record<string, string>>
}): HostController {
  return new HostController({
    candidates: hostModuleCandidates({ envPath: input.envPath, userDataDir: input.userDataDir, startDirs: [input.appPath, input.cwd] }),
    effects: realHostEffects(),
    clock: { now: () => Date.now(), sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) },
    extraApiEnv: input.extraApiEnv,
  })
}

export function realHostEffects(): HostEffects {
  return {
    readText(path) {
      try {
        return readFileSync(path, 'utf8')
      } catch {
        return null
      }
    },
    exists: (path) => existsSync(path),
    writeText(path, text) {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, text)
    },
    appendLog(path, text) {
      appendCappedLog(disk, path, text)
    },
    radminIp: () => findRadminIpv4(networkInterfaces()),
    probe: (ip) => probeHost(ip),
    spawn: (spec) => spawnLogged(spec),
    killTree: (pid) => killProcessTree(pid),
    firewallOutput: () => capture(firewallQueryCommand()),
    elevateFirewall: (scriptPath) => captureCode(firewallElevationCommand(scriptPath)),
    randomBytes: (length) => new Uint8Array(randomBytes(length)),
  }
}

async function probeHost(ip: string): Promise<HostProbe> {
  const [apiOpen, livekitOpen, health] = await Promise.all([
    tcpAccepts(ip, API_PORT, 800),
    tcpAccepts(ip, LIVEKIT_PORT, 800),
    readHealth(ip),
  ])
  return {
    healthOk: health !== null,
    apiOpen: apiOpen || health !== null,
    livekitOpen,
    online: health?.online ?? 0,
    inVoice: health?.inVoice ?? 0,
  }
}

async function readHealth(ip: string): Promise<{ online: number; inVoice: number } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 800)
  try {
    const response = await fetch(`http://${ip}:${API_PORT}/health`, { signal: controller.signal })
    if (!response.ok) return null
    return parseHealthBody(await response.json())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function spawnLogged(spec: HostSpawnSpec): HostProcessHandle {
  const child = spawn(spec.file, spec.args, {
    cwd: spec.cwd,
    env: { ...process.env, ...spec.env },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (!child.pid) throw new Error(`Não foi possível iniciar ${spec.name}.`)
  const logPath = spec.logPath
  const write = (chunk: Buffer): void => {
    if (logPath) appendCappedLog(disk, logPath, chunk.toString('utf8'))
  }
  child.stdout?.on('data', write)
  child.stderr?.on('data', write)
  let exit: { code: number } | null = null
  child.on('exit', (code) => {
    exit = { code: code ?? 1 }
  })
  return { pid: child.pid, exited: () => exit }
}

async function killProcessTree(pid: number): Promise<void> {
  const command = killTreeCommand(pid, process.platform)
  spawnSync(command.file, command.args, { windowsHide: true })
}

async function capture(command: { file: string; args: string[] }): Promise<string> {
  const result = spawnSync(command.file, command.args, { encoding: 'utf8', windowsHide: true })
  return `${result.stdout ?? ''}${result.stderr ?? ''}`
}

async function captureCode(command: { file: string; args: string[] }): Promise<{ code: number; output: string }> {
  const result = spawnSync(command.file, command.args, { encoding: 'utf8', windowsHide: true })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`
  return { code: result.status ?? 1, output }
}
