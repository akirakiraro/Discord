import { describe, expect, it } from 'vitest'
import { liveKitYaml } from './hostLaunch'
import { HOST_ERROR, closeWarning, explainHostExit, stopWarning } from './hostMessages'
import type { HostModule } from './hostModule'
import { HostController } from './hostController'
import type { HostEffects } from './hostEffects'
import type { HostClock, HostProbe } from './hostProbe'
import type { HostProcessHandle, HostSpawnSpec } from './hostLaunch'

const IP = '26.186.21.58'
const SECRET = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcH'
const DOWN: HostProbe = { healthOk: false, apiOpen: false, livekitOpen: false, online: 0, inVoice: 0 }
const UP: HostProbe = { healthOk: true, apiOpen: true, livekitOpen: true, online: 2, inVoice: 1 }

const MODULE: HostModule = {
  version: 1,
  repoRoot: '/repo',
  livekitExe: '/repo/livekit-server.exe',
  serverEntry: '/repo/apps/server/src/index.ts',
  serverDir: '/repo/apps/server',
  tsxLoader: '/repo/node_modules/tsx/dist/loader.mjs',
  nodeExe: '/usr/bin/node',
  firewallScript: '/repo/infra/host/open-firewall.ps1',
  logDir: '/repo/infra/host/logs',
  dataDir: '/repo/infra/host/data',
  generatedDir: '/repo/infra/host/generated',
  databasePath: '/repo/infra/host/data/radcord.db',
}

class FakeClock implements HostClock {
  ms = 0
  sleeps: number[] = []

  now(): number {
    return this.ms
  }

  async sleep(ms: number): Promise<void> {
    this.sleeps.push(ms)
    this.ms += ms
    await Promise.resolve()
  }
}

class FakeEffects implements HostEffects {
  files = new Map<string, string>([['/manifest.json', JSON.stringify(MODULE)]])
  present = new Set([MODULE.livekitExe, MODULE.serverEntry, MODULE.nodeExe, MODULE.tsxLoader])
  ip: string | null = IP
  probeState: HostProbe = DOWN
  upAfterSpawn = false
  spawned: HostSpawnSpec[] = []
  handles: Array<HostProcessHandle & { exit: { code: number } | null }> = []
  exitOnSpawn: { index: number; code: number } | null = null
  logOnExit: { index: number; text: string } | null = null
  killed: number[] = []
  appended: string[] = []
  firewall = ''
  elevation: { code: number; output: string } = { code: 0, output: '' }
  randomCalls = 0

  readText(path: string): string | null {
    return this.files.get(path) ?? null
  }

  exists(path: string): boolean {
    return this.present.has(path)
  }

  writeText(path: string, text: string): void {
    this.files.set(path, text)
  }

  appendLog(path: string, text: string): void {
    this.appended.push(text)
    this.files.set(path, `${this.files.get(path) ?? ''}${text}`)
  }

  radminIp(): string | null {
    return this.ip
  }

  probe(): Promise<HostProbe> {
    return Promise.resolve(this.probeState)
  }

  spawn(spec: HostSpawnSpec): HostProcessHandle {
    const index = this.handles.length
    const handle = { pid: 4100 + index, exit: null as { code: number } | null, exited: () => handle.exit }
    if (this.exitOnSpawn && index === this.exitOnSpawn.index) handle.exit = { code: this.exitOnSpawn.code }
    if (this.logOnExit && index === this.logOnExit.index && spec.logPath) this.appendLog(spec.logPath, this.logOnExit.text)
    this.handles.push(handle)
    this.spawned.push(spec)
    if (this.upAfterSpawn && this.spawned.length === 2) this.probeState = UP
    return handle
  }

  killTree(pid: number): Promise<void> {
    this.killed.push(pid)
    if (!this.upAfterSpawn) this.probeState = DOWN
    return Promise.resolve()
  }

  firewallOutput(): Promise<string> {
    return Promise.resolve(this.firewall)
  }

  elevateFirewall(): Promise<{ code: number; output: string }> {
    return Promise.resolve(this.elevation)
  }

  randomBytes(length: number): Uint8Array {
    this.randomCalls += 1
    return Uint8Array.from({ length }, () => 7)
  }
}

function controller(effects: FakeEffects, clock = new FakeClock()): HostController {
  return new HostController({ candidates: ['/manifest.json'], effects, clock })
}

describe('HostController', () => {
  it('sobe node e o LiveKit no IP 26.186.21.58 e só fica ligado com /health e a 7880', async () => {
    const effects = new FakeEffects()
    effects.upAfterSpawn = true
    const host = controller(effects)

    const snapshot = await host.start()

    expect(snapshot).toMatchObject({ phase: 'on', ownedByApp: true, moduleReady: true, radminIp: IP, online: 2, inVoice: 1, message: null })
    expect(effects.spawned.map((spec) => spec.file)).toEqual([MODULE.livekitExe, MODULE.nodeExe])
    expect(effects.spawned[1]).toMatchObject({
      name: 'api',
      args: ['--import', 'file:///repo/node_modules/tsx/dist/loader.mjs', MODULE.serverEntry],
      cwd: MODULE.serverDir,
      env: {
        BIND_HOST: IP,
        PORT: '3000',
        DATABASE_PATH: MODULE.databasePath,
        LIVEKIT_API_KEY: 'radcord',
        LIVEKIT_API_SECRET: SECRET,
        LIVEKIT_PUBLIC_URL: `ws://${IP}:7880`,
      },
    })
    expect(effects.spawned[0]?.args).toEqual(['--config', '/repo/infra/host/generated/livekit.yaml'])
    expect(effects.files.get('/repo/infra/host/generated/livekit.yaml')).toBe(liveKitYaml(IP, SECRET))
    expect(effects.appended).toEqual([`ligando LiveKit em ${IP}\n`, `ligando API em ${IP}\n`])
    expect(effects.randomCalls).toBe(1)
  })

  it('sem IP 26.x não cria processo', async () => {
    const effects = new FakeEffects()
    effects.ip = null

    const snapshot = await controller(effects).start()

    expect(snapshot.phase).toBe('error')
    expect(snapshot.message).toBe(HOST_ERROR.noRadmin)
    expect(effects.spawned).toEqual([])
  })

  it('sem o Node ou sem o tsx explica o que rodar', async () => {
    const noNode = new FakeEffects()
    noNode.present.delete(MODULE.nodeExe)
    expect((await controller(noNode).start()).message).toBe(HOST_ERROR.noNode)

    const noTsx = new FakeEffects()
    noTsx.present.delete(MODULE.tsxLoader)
    expect((await controller(noTsx).start()).message).toBe(HOST_ERROR.noTsx)
    expect(noTsx.spawned).toEqual([])
  })

  it('porta 7880 ocupada não sobe outro host', async () => {
    const effects = new FakeEffects()
    effects.probeState = { ...DOWN, livekitOpen: true }

    const snapshot = await controller(effects).start()

    expect(snapshot.message).toBe('A porta 7880 já está em uso. Feche o host aberto no terminal, ou o programa que está nessa porta, e tente de novo.')
    expect(effects.spawned).toEqual([])
  })

  it('health e 7880 já no ar viram ligado fora do app, sem processo novo', async () => {
    const effects = new FakeEffects()
    effects.probeState = UP

    const host = controller(effects)
    const snapshot = await host.start()

    expect(snapshot).toMatchObject({ phase: 'external', ownedByApp: false, online: 2, inVoice: 1, message: HOST_ERROR.externalStop })
    expect(effects.spawned).toEqual([])
    expect((await host.stop()).message).toBe(HOST_ERROR.externalStop)
    expect(effects.killed).toEqual([])
  })

  it('estoura os 20 s, mata a árvore e conta o erro', async () => {
    const effects = new FakeEffects()
    const clock = new FakeClock()
    const host = controller(effects, clock)

    const snapshot = await host.start()

    expect(snapshot.message).toBe(HOST_ERROR.timeout)
    expect(snapshot.phase).toBe('error')
    expect(clock.ms).toBe(20_000)
    expect(clock.sleeps.every((ms) => ms === 500)).toBe(true)
    expect(effects.killed).toEqual([4101, 4100])
  })

  it('LiveKit que sai com código 1 falha antes de marcar ligado', async () => {
    const effects = new FakeEffects()
    effects.exitOnSpawn = { index: 0, code: 1 }

    const snapshot = await controller(effects).start()

    expect(snapshot.message).toBe('O LiveKit encerrou com código 1 antes do host ficar pronto.')
    expect(snapshot.phase).toBe('error')
    expect(effects.killed).toEqual([4101, 4100])
  })

  it('API que sai com código 1 mostra o erro do Node em português', async () => {
    const effects = new FakeEffects()
    const nodeError = [
      'node:internal/modules/esm/load:195',
      '    throw new ERR_UNSUPPORTED_ESM_URL_SCHEME(parsed, schemes);',
      "Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]: Only URLs with a scheme in: file, data, and node are supported by the default ESM loader. On Windows, absolute paths must be valid file:// URLs. Received protocol 'c:'",
      'Node.js v24.15.0',
    ].join('\n')
    effects.exitOnSpawn = { index: 1, code: 1 }
    effects.logOnExit = { index: 1, text: `${nodeError}\n` }

    const snapshot = await controller(effects).start()

    const log = effects.files.get('/repo/infra/host/logs/api.log') ?? ''
    expect(snapshot.message).toBe(explainHostExit('API', 1, log))
    expect(snapshot.message).toContain('O API encerrou com código 1 antes do host ficar pronto.')
    expect(snapshot.message).toContain('protocolo "c:"')
    expect(snapshot.message).toContain('Error [ERR_UNSUPPORTED_ESM_URL_SCHEME]')
    expect(snapshot.message).not.toContain('antigo demais')
    expect(snapshot.phase).toBe('error')
  })

  it('desligar mata a API e o LiveKit e só fica off quando as portas fecham', async () => {
    const effects = new FakeEffects()
    effects.upAfterSpawn = true
    const host = controller(effects)
    await host.start()
    effects.upAfterSpawn = false

    const preview = await host.previewStop()
    const stopped = await host.stop()

    expect(preview).toEqual({ allowed: true, online: 2, inVoice: 1, message: stopWarning(2, 1) })
    expect(stopped).toMatchObject({ phase: 'off', ownedByApp: false, message: null, online: 0, inVoice: 0 })
    expect(effects.killed).toEqual([4101, 4100])
  })

  it('se a porta continua ocupada o desligar termina em erro', async () => {
    const effects = new FakeEffects()
    effects.upAfterSpawn = true
    const host = controller(effects)
    await host.start()

    const stopped = await host.stop()

    expect(stopped.phase).toBe('error')
    expect(stopped.message).toBe(HOST_ERROR.portsStuck)
    expect(effects.killed).toEqual([4101, 4100])
  })

  it('fechar com gente na call pede confirmação e sem ninguém manda desligar', async () => {
    const effects = new FakeEffects()
    effects.upAfterSpawn = true
    const host = controller(effects)
    await host.start()

    expect(await host.prepareClose()).toEqual({ kind: 'confirm', online: 2, inVoice: 1, message: closeWarning(2, 1) })

    effects.probeState = { ...UP, online: 0, inVoice: 0 }
    expect(await host.prepareClose()).toEqual({ kind: 'stop-then-quit' })
  })

  it('host do terminal não entra no plano de fechar nem segura a atualização', async () => {
    const effects = new FakeEffects()
    effects.probeState = UP
    const host = controller(effects)
    await host.refresh()

    expect(host.view()).toMatchObject({ phase: 'external', ownedByApp: false })
    expect(await host.prepareClose()).toEqual({ kind: 'quit' })
    expect(host.ownsRunning()).toBe(false)
  })

  it('mostra as últimas 40 linhas de cada log', async () => {
    const effects = new FakeEffects()
    const lines = Array.from({ length: 41 }, (_, index) => `linha-${index}`).join('\n')
    effects.files.set('/repo/infra/host/logs/api.log', lines)
    effects.files.set('/repo/infra/host/logs/livekit.log', 'lk-1\nlk-2')

    const snapshot = await controller(effects).refresh()

    expect(snapshot.apiLog).toHaveLength(40)
    expect(snapshot.apiLog[0]).toBe('linha-1')
    expect(snapshot.apiLog[39]).toBe('linha-40')
    expect(snapshot.livekitLog).toEqual(['lk-1', 'lk-2'])
  })

  it('firewall ok, cancelado e pronto têm frase própria', async () => {
    const effects = new FakeEffects()
    effects.firewall = 'SoundRoom - API do host\nSoundRoom - LiveKit sinalizacao\nSoundRoom - LiveKit midia'
    const host = controller(effects)

    expect((await host.checkFirewall()).message).toBe(HOST_ERROR.firewallOk)

    effects.firewall = 'SoundRoom - API do host'
    expect((await host.checkFirewall()).message).toBe(HOST_ERROR.firewallMissing)

    effects.elevation = { code: 1223, output: '' }
    expect((await host.openFirewall()).message).toBe(HOST_ERROR.firewallCancelled)
  })
})
