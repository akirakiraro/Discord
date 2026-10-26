import { join, posix, win32 } from 'node:path'

export const HOST_MODULE_VERSION = 1

export interface HostModule {
  version: 1
  repoRoot: string
  livekitExe: string
  serverEntry: string
  serverDir: string
  tsxLoader: string
  nodeExe: string
  firewallScript: string
  logDir: string
  dataDir: string
  generatedDir: string
  databasePath: string
}

const FIELDS = [
  'repoRoot',
  'livekitExe',
  'serverEntry',
  'serverDir',
  'tsxLoader',
  'nodeExe',
  'firewallScript',
  'logDir',
  'dataDir',
  'generatedDir',
  'databasePath',
] as const

/**
 * Caminho absoluto no Windows (`C:\...`) ou no POSIX (`/...).
 * Exemplo: `isHostPath('C:/repo/infra/host/bin/livekit-server.exe')`.
 */
export function isHostPath(value: string): boolean {
  return win32.isAbsolute(value) || posix.isAbsolute(value)
}

/**
 * Lê o JSON do manifesto. Caminho relativo ou versão diferente de 1 devolve null.
 * Exemplo: `parseHostModule(readFileSync(path, 'utf8'))`.
 */
export function parseHostModule(text: string): HostModule | null {
  let raw: unknown
  try {
    raw = JSON.parse(text) as unknown
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (record.version !== HOST_MODULE_VERSION) return null
  const paths: Partial<Record<(typeof FIELDS)[number], string>> = {}
  for (const field of FIELDS) {
    const value = record[field]
    if (typeof value !== 'string' || !isHostPath(value)) return null
    paths[field] = value
  }
  return { version: HOST_MODULE_VERSION, ...(paths as Record<(typeof FIELDS)[number], string>) }
}

/**
 * O manifesto só vale com o binário do LiveKit e a entrada do server no disco.
 * Exemplo: `moduleFilesReady(module, existsSync)`.
 */
export function moduleFilesReady(module: HostModule, exists: (path: string) => boolean): boolean {
  return exists(module.livekitExe) && exists(module.serverEntry)
}

export interface ReadyHostModule {
  path: string
  module: HostModule
}

/**
 * O primeiro candidato com JSON válido e os dois arquivos presentes.
 * Exemplo: `findReadyModule(candidates, readFile, existsSync)`.
 */
export function findReadyModule(
  candidates: readonly string[],
  readText: (path: string) => string | null,
  exists: (path: string) => boolean,
): ReadyHostModule | null {
  for (const path of candidates) {
    const text = readText(path)
    if (text === null) continue
    const parsed = parseHostModule(text)
    if (!parsed || !moduleFilesReady(parsed, exists)) continue
    return { path, module: parsed }
  }
  return null
}

/**
 * Onde o app procura o manifesto. A variável, a pasta do app e a subida a partir do código.
 * Exemplo: `hostModuleCandidates({ envPath, userDataDir, startDirs })`.
 */
export function hostModuleCandidates(input: { envPath?: string; userDataDir: string; startDirs: readonly string[] }): string[] {
  const listed: string[] = []
  const fromEnv = input.envPath?.trim()
  if (fromEnv) listed.push(fromEnv)
  listed.push(join(input.userDataDir, 'host-module.json'))
  for (const start of input.startDirs) {
    for (const dir of walkParents(start, 6)) listed.push(join(dir, 'infra', 'host', 'host-module.json'))
  }
  return unique(listed)
}

/**
 * Logs da API e do LiveKit. Exemplo: `hostLogPaths(module).api`.
 */
export function hostLogPaths(module: HostModule): { api: string; livekit: string } {
  return {
    api: join(module.logDir, 'api.log'),
    livekit: join(module.logDir, 'livekit.log'),
  }
}

function walkParents(start: string, levels: number): string[] {
  const found: string[] = []
  let current = start
  for (let depth = 0; depth <= levels; depth += 1) {
    found.push(current)
    const parent = parentDir(current)
    if (parent === current) break
    current = parent
  }
  return found
}

function parentDir(dir: string): string {
  const slash = Math.max(dir.lastIndexOf('/'), dir.lastIndexOf('\\'))
  if (slash <= 0) return dir
  return dir.slice(0, slash)
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }
  return result
}
