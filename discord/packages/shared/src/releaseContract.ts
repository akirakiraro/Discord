import { z } from 'zod'

const RELEASE_VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/

/** O host manda isto no socket quando a release pública muda, e de novo para quem acabou de conectar. */
export const appReleasePayloadSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
})

export type AppReleasePayload = z.infer<typeof appReleasePayloadSchema>

/**
 * Tira o prefixo `v` e recusa pre-release.
 * Exemplo: `normalizeReleaseVersion('v0.1.117')` devolve `'0.1.117'`.
 */
export function normalizeReleaseVersion(raw: string): string | null {
  const match = RELEASE_VERSION.exec(raw.trim())
  if (!match) return null
  return `${match[1]}.${match[2]}.${match[3]}`
}

/**
 * Compara `0.1.N` como semver (número, não texto).
 * Exemplo: `compareReleaseVersions('0.1.10', '0.1.9')` devolve `1`.
 */
export function compareReleaseVersions(left: string, right: string): number {
  const a = versionParts(left)
  const b = versionParts(right)
  if (!a || !b) {
    throw new Error(`Versão inválida: recebido ${JSON.stringify(left)} e ${JSON.stringify(right)}, esperado 0.1.N`)
  }
  return compareParts(a, b)
}

/**
 * Exemplo: `isNewerRelease('v0.1.117', '0.1.116')` devolve `true`.
 */
export function isNewerRelease(candidate: string, installed: string): boolean {
  const next = normalizeReleaseVersion(candidate)
  const current = normalizeReleaseVersion(installed)
  if (!next || !current) return false
  return compareReleaseVersions(next, current) > 0
}

/**
 * Payload do handshake. Versão ilegível vira `null` e o socket não emite.
 * Exemplo: `knownReleasePayload('v0.1.4')` devolve `{ version: '0.1.4' }`.
 */
export function knownReleasePayload(version: string | null): AppReleasePayload | null {
  if (!version) return null
  const normalized = normalizeReleaseVersion(version)
  if (!normalized) return null
  return { version: normalized }
}

function versionParts(raw: string): [number, number, number] | null {
  const normalized = normalizeReleaseVersion(raw)
  if (!normalized) return null
  const parts = normalized.split('.').map((part) => Number(part))
  const major = parts[0]
  const minor = parts[1]
  const patch = parts[2]
  if (major === undefined || minor === undefined || patch === undefined) return null
  return [major, minor, patch]
}

function compareParts(left: [number, number, number], right: [number, number, number]): number {
  const delta = left[0] - right[0] || left[1] - right[1] || left[2] - right[2]
  if (delta === 0) return 0
  return delta > 0 ? 1 : -1
}
