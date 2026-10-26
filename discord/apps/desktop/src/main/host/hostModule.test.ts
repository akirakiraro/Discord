import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findReadyModule, hostModuleCandidates, isHostPath, moduleFilesReady, parseHostModule, type HostModule } from './hostModule'

const MODULE: HostModule = {
  version: 1,
  repoRoot: '/repo',
  livekitExe: '/repo/livekit-server.exe',
  serverEntry: '/repo/apps/server/src/index.ts',
  serverDir: '/repo/apps/server',
  tsxLoader: '/repo/node_modules/tsx/dist/loader.mjs',
  nodeExe: 'C:/Program Files/nodejs/node.exe',
  firewallScript: '/repo/infra/host/open-firewall.ps1',
  logDir: '/repo/infra/host/logs',
  dataDir: '/repo/infra/host/data',
  generatedDir: '/repo/infra/host/generated',
  databasePath: '/repo/infra/host/data/radcord.db',
}

describe('manifesto do módulo de host', () => {
  it('aceita caminho de Windows e de POSIX e recusa relativo', () => {
    expect(isHostPath('C:/repo/livekit-server.exe')).toBe(true)
    expect(isHostPath('C:\\repo\\livekit-server.exe')).toBe(true)
    expect(isHostPath('/repo/livekit-server.exe')).toBe(true)
    expect(isHostPath('infra/host/bin/livekit-server.exe')).toBe(false)
  })

  it('lê a versão 1 e recusa versão, JSON e campo vazio', () => {
    expect(parseHostModule(JSON.stringify(MODULE))).toEqual(MODULE)
    expect(parseHostModule(JSON.stringify({ ...MODULE, version: 2 }))).toBeNull()
    expect(parseHostModule('{')).toBeNull()
    expect(parseHostModule(JSON.stringify({ ...MODULE, livekitExe: 'bin/livekit-server.exe' }))).toBeNull()
    expect(parseHostModule(JSON.stringify({ ...MODULE, nodeExe: '' }))).toBeNull()
  })

  it('sem arquivo, sem exe ou sem a entrada do server o módulo não fica pronto', () => {
    const text = JSON.stringify(MODULE)
    const read = (path: string): string | null => (path === '/manifest.json' ? text : null)
    const ready = (path: string): boolean => path === MODULE.livekitExe || path === MODULE.serverEntry

    expect(findReadyModule(['/ausente.json', '/manifest.json'], read, ready)).toEqual({ path: '/manifest.json', module: MODULE })
    expect(findReadyModule(['/ausente.json'], read, ready)).toBeNull()
    expect(findReadyModule(['/manifest.json'], read, (path) => path === MODULE.serverEntry)).toBeNull()
    expect(findReadyModule(['/manifest.json'], read, (path) => path === MODULE.livekitExe)).toBeNull()
    expect(findReadyModule(['/manifest.json'], () => '{', ready)).toBeNull()
  })

  it('procura a variável, o userData e a subida a partir do app', () => {
    const candidates = hostModuleCandidates({
      envPath: 'D:/modulo/host-module.json',
      userDataDir: 'C:/Users/akira/AppData/Roaming/Radcord',
      startDirs: ['C:/Users/akira/AppData/Local/Programs/app'],
    })

    expect(candidates[0]).toBe('D:/modulo/host-module.json')
    expect(candidates[1]).toBe('C:/Users/akira/AppData/Roaming/Radcord/host-module.json')
    expect(candidates).toContain('C:/Users/akira/AppData/Local/Programs/app/infra/host/host-module.json')
    expect(candidates).toContain('C:/Users/akira/AppData/Local/Programs/infra/host/host-module.json')
  })

  it('o script grava a versão 1 com o exe, o server e a cópia do app', () => {
    const root = mkdtempSync(join(tmpdir(), 'radcord-host-'))
    const appData = mkdtempSync(join(tmpdir(), 'radcord-appdata-'))
    mkdirSync(join(root, 'node_modules', 'tsx', 'dist'), { recursive: true })
    writeFileSync(join(root, 'node_modules', 'tsx', 'dist', 'loader.mjs'), '')
    mkdirSync(join(root, 'apps', 'server', 'src'), { recursive: true })
    writeFileSync(join(root, 'apps', 'server', 'src', 'index.ts'), '')
    mkdirSync(join(root, 'infra', 'host', 'bin'), { recursive: true })
    writeFileSync(join(root, 'infra', 'host', 'bin', 'livekit-server.exe'), '')
    const script = fileURLToPath(new URL('../../../../../scripts/write-host-module.mjs', import.meta.url))

    execFileSync(process.execPath, [script, '--root', root, '--appdata', appData], { encoding: 'utf8' })

    const written = parseHostModule(readFileSync(join(root, 'infra', 'host', 'host-module.json'), 'utf8'))
    const copy = parseHostModule(readFileSync(join(appData, 'Radcord', 'host-module.json'), 'utf8'))
    expect(written?.version).toBe(1)
    expect(written?.nodeExe).toBe(process.execPath)
    expect(written?.livekitExe).toBe(join(root, 'infra', 'host', 'bin', 'livekit-server.exe'))
    expect(written && moduleFilesReady(written, existsSync)).toBe(true)
    expect(copy).toEqual(written)
  })
})
