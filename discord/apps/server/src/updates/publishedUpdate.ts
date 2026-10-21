import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import {
  DESKTOP_UPDATE_FILE_NAME,
  desktopUpdateManifestSchema,
  type DesktopUpdateManifest,
} from '@radcord/shared'

export interface PublishedDesktopUpdate {
  manifest: DesktopUpdateManifest
  filePath: string
}

/**
 * Lê `latest.json` e o `Radcord.exe` publicados na pasta do host.
 * Exemplo: `readPublishedDesktopUpdate('infra/host/updates')`
 */
export function readPublishedDesktopUpdate(dir: string): PublishedDesktopUpdate | null {
  const manifestPath = insideUpdatesDir(dir, 'latest.json')
  const filePath = insideUpdatesDir(dir, DESKTOP_UPDATE_FILE_NAME)
  if (!existsSync(manifestPath) || !existsSync(filePath)) return null
  const manifest = parseManifest(readFileSync(manifestPath, 'utf8'), manifestPath)
  const size = statSync(filePath).size
  if (size !== manifest.size) {
    throw new Error(`Pacote ${filePath} tem ${size} bytes, esperado ${manifest.size} em latest.json`)
  }
  return { manifest, filePath }
}

function parseManifest(raw: string, manifestPath: string): DesktopUpdateManifest {
  const parsed = desktopUpdateManifestSchema.safeParse(parseJson(raw, manifestPath))
  if (!parsed.success) {
    throw new Error(`latest.json inválido em ${manifestPath}: esperado { version: "0.1.36", sha256: 64 hex, size: inteiro }`)
  }
  return parsed.data
}

function parseJson(raw: string, manifestPath: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    throw new Error(`latest.json inválido em ${manifestPath}: esperado um objeto JSON`)
  }
}

function insideUpdatesDir(dir: string, name: string): string {
  const root = resolve(dir)
  const file = resolve(root, name)
  const prefix = root.endsWith(sep) ? root : root + sep
  if (name.includes('..') || !file.startsWith(prefix)) {
    throw new Error(`Arquivo de atualização fora da pasta: recebido ${JSON.stringify(name)}, esperado dentro de ${root}`)
  }
  return file
}
