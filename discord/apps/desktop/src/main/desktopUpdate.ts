import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  DESKTOP_UPDATE_DOWNLOAD_PATH,
  DESKTOP_UPDATE_MANIFEST_PATH,
  desktopUpdateManifestSchema,
  isNewerDesktopVersion,
  type DesktopUpdateManifest,
} from '@radcord/shared'

const MAX_UPDATE_BYTES = 400_000_000
const HOST_BASE = /^http:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i

export interface DesktopUpdateDeps {
  packaged: boolean
  portablePath: string | null
  baseUrl: string
  currentVersion: string
  downloadPath: string
  pid: number
  fetchFn: typeof fetch
  confirm: (version: string) => Promise<boolean>
  launchSwap: (script: string) => void
  quit: () => void
}

/**
 * Compara a versão empacotada com a do host e, se o usuário aceitar, troca o exe portátil.
 * Exemplo: `await checkAndInstallUpdate({ packaged: true, portablePath, baseUrl, ... })`
 */
export async function checkAndInstallUpdate(deps: DesktopUpdateDeps): Promise<string> {
  const portablePath = deps.portablePath
  if (!deps.packaged || !portablePath) return 'skipped'
  const manifest = await readAvailableManifest(deps)
  if (!manifest || !isNewerDesktopVersion(deps.currentVersion, manifest.version)) return manifest ? 'current' : 'unavailable'
  if (!(await deps.confirm(manifest.version))) return 'declined'
  await downloadVerifiedUpdate(updateDownloadUrl(deps.baseUrl), manifest, deps.downloadPath, deps.fetchFn)
  deps.launchSwap(portableSwapScript(deps.pid, deps.downloadPath, portablePath))
  deps.quit()
  return 'installed'
}

async function readAvailableManifest(deps: DesktopUpdateDeps): Promise<DesktopUpdateManifest | null> {
  try {
    return await fetchUpdateManifest(deps.baseUrl, deps.fetchFn)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ event: 'desktop_update_check_failed', message }))
    return null
  }
}

export function assertHostBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!HOST_BASE.test(trimmed)) {
    throw new Error(`Host da atualização inválido: recebido ${JSON.stringify(baseUrl)}, esperado http://IP:porta`)
  }
  return trimmed
}

export async function fetchUpdateManifest(baseUrl: string, fetchFn: typeof fetch): Promise<DesktopUpdateManifest | null> {
  const response = await fetchFn(`${assertHostBaseUrl(baseUrl)}${DESKTOP_UPDATE_MANIFEST_PATH}`, { redirect: 'error' })
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Falha ao ler atualização: HTTP ${response.status}, esperado 200 em ${DESKTOP_UPDATE_MANIFEST_PATH}`)
  }
  return parseManifest(await response.json())
}

function parseManifest(payload: unknown): DesktopUpdateManifest {
  const parsed = desktopUpdateManifestSchema.safeParse(payload)
  if (!parsed.success) {
    throw new Error('Manifesto de atualização inválido: esperado { version, sha256, size }')
  }
  return parsed.data
}

export function updateDownloadUrl(baseUrl: string): string {
  return `${assertHostBaseUrl(baseUrl)}${DESKTOP_UPDATE_DOWNLOAD_PATH}`
}

export async function downloadVerifiedUpdate(
  url: string,
  expected: DesktopUpdateManifest,
  destination: string,
  fetchFn: typeof fetch,
): Promise<void> {
  assertUpdateSize(expected.size)
  const bytes = await readUpdateBody(url, expected.size, fetchFn)
  assertUpdateBytes(bytes, expected)
  await writeFile(destination, bytes)
}

function assertUpdateSize(size: number): void {
  if (!Number.isInteger(size) || size < 1 || size > MAX_UPDATE_BYTES) {
    throw new Error(`Pacote com ${size} bytes, esperado inteiro entre 1 e ${MAX_UPDATE_BYTES}`)
  }
}

async function readUpdateBody(url: string, expectedSize: number, fetchFn: typeof fetch): Promise<Buffer> {
  const response = await fetchFn(url, { redirect: 'error' })
  if (!response.ok) {
    throw new Error(`Download da atualização falhou: HTTP ${response.status}, esperado 200`)
  }
  const advertised = Number(response.headers.get('content-length'))
  if (Number.isInteger(advertised) && advertised > expectedSize) {
    throw new Error(`Download anuncia ${advertised} bytes, esperado ${expectedSize}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

export function assertUpdateBytes(bytes: Buffer, expected: Pick<DesktopUpdateManifest, 'sha256' | 'size'>): void {
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (bytes.length !== expected.size || sha256 !== expected.sha256) {
    throw new Error(`Pacote baixado: ${bytes.length} bytes e sha256 ${sha256}, esperado ${expected.size} bytes e ${expected.sha256}`)
  }
}

/**
 * O exe portátil fica travado enquanto o app roda, e `process.execPath` aponta para a
 * cópia extraída em temp. O stub que a pessoa abriu está em PORTABLE_EXECUTABLE_FILE.
 * Exemplo: `portableSwapScript(412, 'C:\\\\Temp\\\\Radcord-update.exe', 'D:\\\\Radcord.exe')`
 */
export function portableSwapScript(pid: number, source: string, destination: string): string {
  if (!Number.isInteger(pid) || pid < 1) {
    throw new Error(`PID inválido: recebido ${JSON.stringify(pid)}, esperado inteiro positivo`)
  }
  return [
    "$ErrorActionPreference = 'Stop'",
    `Wait-Process -Id ${pid} -ErrorAction SilentlyContinue`,
    'Start-Sleep -Milliseconds 800',
    `Copy-Item -LiteralPath ${psQuote(source)} -Destination ${psQuote(destination)} -Force`,
    `Start-Process -FilePath ${psQuote(destination)}`,
  ].join('\n')
}

function psQuote(value: string): string {
  if (value.includes('\0') || value.includes('\n') || value.includes('\r')) {
    throw new Error(`Caminho inválido para troca do app: recebido ${JSON.stringify(value)}`)
  }
  return `'${value.replaceAll("'", "''")}'`
}

export function launchPortableSwap(script: string): void {
  const scriptPath = join(tmpdir(), `radcord-update-${process.pid}.ps1`)
  writeFileSync(scriptPath, `\uFEFF${script}`, 'utf8')
  const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })
  child.unref()
}
