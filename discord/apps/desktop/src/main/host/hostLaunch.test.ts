import { win32 } from 'node:path'
import { describe, expect, it } from 'vitest'
import { apiEnvironment, apiSpawn, ensureLiveKitSecret, formatLiveKitSecret, killTreeCommand, liveKitSpawn, liveKitYaml, nodeImportSpecifier } from './hostLaunch'
import type { HostModule } from './hostModule'

describe('plano de subida do host', () => {
  it('gera o segredo de 36 bytes e reusa o que já tem 32', () => {
    const bytes = Uint8Array.from({ length: 36 }, () => 7)

    expect(formatLiveKitSecret(bytes)).toBe('BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcH')
    expect(ensureLiveKitSecret('curto', () => bytes)).toBe('BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcH')
    expect(ensureLiveKitSecret('a'.repeat(32), () => bytes)).toBe('a'.repeat(32))
  })

  it('grava o YAML preso ao 26.186.21.58', () => {
    expect(liveKitYaml('26.186.21.58', 'segredo-de-teste-com-32-caracteres')).toBe(
      [
        'port: 7880',
        'bind_addresses:',
        '  - "26.186.21.58"',
        'rtc:',
        '  tcp_port: 7881',
        '  port_range_start: 50000',
        '  port_range_end: 50100',
        '  use_external_ip: false',
        '  node_ip: "26.186.21.58"',
        '  ips:',
        '    includes:',
        '      - 26.0.0.0/8',
        'keys:',
        '  radcord: "segredo-de-teste-com-32-caracteres"',
        'logging:',
        '  level: info',
        '',
      ].join('\n'),
    )
  })

  it('monta o ambiente da API e o taskkill da árvore', () => {
    expect(apiEnvironment('26.186.21.58', 'segredo-de-teste-com-32-caracteres', '/repo/data/radcord.db')).toEqual({
      BIND_HOST: '26.186.21.58',
      PORT: '3000',
      DATABASE_PATH: '/repo/data/radcord.db',
      LIVEKIT_API_KEY: 'radcord',
      LIVEKIT_API_SECRET: 'segredo-de-teste-com-32-caracteres',
      LIVEKIT_PUBLIC_URL: 'ws://26.186.21.58:7880',
    })
    expect(killTreeCommand(4242, 'win32')).toEqual({ file: 'taskkill', args: ['/PID', '4242', '/T', '/F'] })
    expect(killTreeCommand(4242, 'linux')).toEqual({ file: 'kill', args: ['-TERM', '4242'] })
    expect(() => killTreeCommand(0, 'win32')).toThrow(/pid 0/)
  })

  it('no Windows o --import é file:///C:/Users/... e o node.exe continua caminho', () => {
    const database = win32.join('C:\\Program Files\\Radcord\\data', 'radcord.db')
    const config = win32.join('C:\\Program Files\\Radcord\\generated', 'livekit.yaml')
    const serverDir = 'C:\\Users\\Akira\\Documents\\GitHub\\Discord\\discord\\apps\\server'
    const module: HostModule = {
      version: 1,
      repoRoot: 'C:\\Users\\Akira\\Documents\\GitHub\\Discord\\discord',
      livekitExe: 'C:\\Program Files\\Radcord\\bin\\livekit-server.exe',
      serverEntry: 'C:\\Users\\Akira\\Documents\\GitHub\\Discord\\discord\\apps\\server\\src\\index.ts',
      serverDir,
      tsxLoader: 'C:\\Users\\Akira\\Documents\\GitHub\\Discord\\discord\\node_modules\\tsx\\dist\\loader.mjs',
      nodeExe: 'C:\\Program Files\\nodejs\\node.exe',
      firewallScript: 'C:\\Users\\Akira\\Documents\\GitHub\\Discord\\discord\\infra\\host\\open-firewall.ps1',
      logDir: 'C:\\Users\\Akira\\Documents\\GitHub\\Discord\\discord\\infra\\host\\logs',
      dataDir: 'C:\\Program Files\\Radcord\\data',
      generatedDir: 'C:\\Program Files\\Radcord\\generated',
      databasePath: database,
    }
    const env = apiEnvironment('26.186.21.58', 'segredo-de-teste-com-32-caracteres', database)
    const api = apiSpawn(module, env)
    const livekit = liveKitSpawn(module, config)

    expect(api.file).toBe('C:\\Program Files\\nodejs\\node.exe')
    expect(api.cwd).toBe(serverDir)
    expect(api.args).toEqual([
      '--import',
      'file:///C:/Users/Akira/Documents/GitHub/Discord/discord/node_modules/tsx/dist/loader.mjs',
      'C:\\Users\\Akira\\Documents\\GitHub\\Discord\\discord\\apps\\server\\src\\index.ts',
    ])
    expect(env.DATABASE_PATH).toBe(database)
    expect(livekit.file).toBe(module.livekitExe)
    expect(livekit.cwd).toBe(module.generatedDir)
    expect(livekit.args).toEqual(['--config', config])
    expect(nodeImportSpecifier('C:\\Program Files\\tsx\\dist\\loader.mjs')).toBe('file:///C:/Program%20Files/tsx/dist/loader.mjs')
    expect(nodeImportSpecifier('/repo/node_modules/tsx/dist/loader.mjs')).toBe('file:///repo/node_modules/tsx/dist/loader.mjs')
  })
})
