import { z } from 'zod'

export const DESKTOP_UPDATE_FILE_NAME = 'Radcord.exe'
export const DESKTOP_UPDATE_MANIFEST_PATH = '/updates/latest'
export const DESKTOP_UPDATE_DOWNLOAD_PATH = '/updates/Radcord.exe'

const VERSION = /^(\d+)\.(\d+)\.(\d+)$/
const SHA256 = /^[a-f0-9]{64}$/

export const desktopUpdateManifestSchema = z.object({
  version: z.string().regex(VERSION),
  sha256: z.string().regex(SHA256),
  size: z.number().int().positive(),
}).strict()

export type DesktopUpdateManifest = z.infer<typeof desktopUpdateManifestSchema>

/**
 * Diz se `available` é uma versão mais nova que `current` (só `major.minor.patch`).
 * Exemplo: `isNewerDesktopVersion('0.1.36', '0.1.37')` → `true`
 */
export function isNewerDesktopVersion(current: string, available: string): boolean {
  const [currentMajor, currentMinor, currentPatch] = readVersion(current)
  const [availableMajor, availableMinor, availablePatch] = readVersion(available)
  if (availableMajor !== currentMajor) return availableMajor > currentMajor
  if (availableMinor !== currentMinor) return availableMinor > currentMinor
  return availablePatch > currentPatch
}

function readVersion(version: string): [number, number, number] {
  const match = VERSION.exec(version)
  const major = Number(match?.[1])
  const minor = Number(match?.[2])
  const patch = Number(match?.[3])
  if (!match || Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
    throw new Error(`Versão inválida: recebido ${JSON.stringify(version)}, esperado 0.1.36`)
  }
  return [major, minor, patch]
}
