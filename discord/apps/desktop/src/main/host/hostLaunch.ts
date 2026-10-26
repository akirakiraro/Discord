import { join } from 'node:path'
import type { HostModule } from './hostModule'
import { API_PORT, LIVEKIT_PORT } from './hostMessages'

export interface HostSpawnSpec {
  name: 'livekit' | 'api'
  file: string
  args: string[]
  cwd: string
  env: Record<string, string>
  logPath?: string
}

export interface HostProcessHandle {
  pid: number
  exited(): { code: number } | null
}

const MIN_SECRET_LENGTH = 32

/**
 * Mesmo formato do `start-host.ps1`: base64 sem `+/=`.
 * Exemplo: `formatLiveKitSecret(Uint8Array.from({ length: 36 }, () => 7))`.
 */
export function formatLiveKitSecret(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64').replace(/[+/=]/g, '')
}

/**
 * Reusa o segredo do disco quando ele já tem 32 caracteres. Senão gera outro.
 * Exemplo: `ensureLiveKitSecret(null, () => bytes)`.
 */
export function ensureLiveKitSecret(current: string | null, nextBytes: () => Uint8Array): string {
  const trimmed = current?.trim() ?? ''
  if (trimmed.length >= MIN_SECRET_LENGTH) return trimmed
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const secret = formatLiveKitSecret(nextBytes())
    if (secret.length >= MIN_SECRET_LENGTH) return secret
  }
  throw new Error('O segredo do LiveKit ficou com menos de 32 caracteres depois de 5 tentativas.')
}

/**
 * YAML que prende o LiveKit ao IP do Radmin. Exemplo: `liveKitYaml('26.186.21.58', secret)`.
 */
export function liveKitYaml(ip: string, secret: string): string {
  return [
    `port: ${LIVEKIT_PORT}`,
    'bind_addresses:',
    `  - "${ip}"`,
    'rtc:',
    '  tcp_port: 7881',
    '  port_range_start: 50000',
    '  port_range_end: 50100',
    '  use_external_ip: false',
    `  node_ip: "${ip}"`,
    '  ips:',
    '    includes:',
    '      - 26.0.0.0/8',
    'keys:',
    `  radcord: "${secret}"`,
    'logging:',
    '  level: info',
    '',
  ].join('\n')
}

export function liveKitConfigPath(module: HostModule): string {
  return join(module.generatedDir, 'livekit.yaml')
}

export function liveKitSecretPath(module: HostModule): string {
  return join(module.generatedDir, 'livekit-secret.txt')
}

/**
 * Variáveis que a API lê. Não inclui o ambiente inteiro do Electron.
 * Exemplo: `apiEnvironment('26.186.21.58', secret, databasePath)`.
 */
export function apiEnvironment(ip: string, secret: string, databasePath: string): Record<string, string> {
  return {
    BIND_HOST: ip,
    PORT: String(API_PORT),
    DATABASE_PATH: databasePath,
    LIVEKIT_API_KEY: 'radcord',
    LIVEKIT_API_SECRET: secret,
    LIVEKIT_PUBLIC_URL: `ws://${ip}:${LIVEKIT_PORT}`,
  }
}

/**
 * O LiveKit sobe pelo executável, sem `npm`. Exemplo: `liveKitSpawn(module, configPath)`.
 */
export function liveKitSpawn(module: HostModule, configPath: string): HostSpawnSpec {
  return {
    name: 'livekit',
    file: module.livekitExe,
    args: ['--config', configPath],
    cwd: module.generatedDir,
    env: {},
  }
}

/**
 * A API sobe com `node --import tsx`, sem `npm run`. Exemplo: `apiSpawn(module, env)`.
 */
export function apiSpawn(module: HostModule, env: Record<string, string>): HostSpawnSpec {
  return {
    name: 'api',
    file: module.nodeExe,
    args: ['--import', module.tsxLoader, module.serverEntry],
    cwd: module.serverDir,
    env,
  }
}

/**
 * `taskkill /T /F` no Windows. Exemplo: `killTreeCommand(4242, 'win32')`.
 */
export function killTreeCommand(pid: number, platform: NodeJS.Platform): { file: string; args: string[] } {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error(`pid ${pid} inválido ao desligar o host; esperado inteiro maior que 0`)
  }
  if (platform === 'win32') return { file: 'taskkill', args: ['/PID', String(pid), '/T', '/F'] }
  return { file: 'kill', args: ['-TERM', String(pid)] }
}
