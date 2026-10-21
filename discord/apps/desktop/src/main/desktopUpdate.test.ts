import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { DesktopUpdateManifest } from '@radcord/shared'
import {
  assertHostBaseUrl,
  assertUpdateBytes,
  checkAndInstallUpdate,
  portableSwapScript,
  type DesktopUpdateDeps,
} from './desktopUpdate'

const HASH = createHash('sha256').update('radcord').digest('hex')

const MANIFEST: DesktopUpdateManifest = { version: '0.1.37', sha256: HASH, size: 7 }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function deps(fetchFn: typeof fetch, overrides: Partial<DesktopUpdateDeps> = {}): DesktopUpdateDeps {
  return {
    packaged: true,
    portablePath: 'D:\\Radcord.exe',
    baseUrl: 'http://26.186.21.58:3000',
    currentVersion: '0.1.36',
    downloadPath: 'C:\\Temp\\Radcord-update.exe',
    pid: 412,
    fetchFn,
    confirm: vi.fn<(version: string) => Promise<boolean>>().mockResolvedValue(true),
    launchSwap: vi.fn(),
    quit: vi.fn(),
    ...overrides,
  }
}

describe('checkAndInstallUpdate', () => {
  it('não consulta o host no app de desenvolvimento', async () => {
    const fetchFn = vi.fn<typeof fetch>()

    await expect(checkAndInstallUpdate(deps(fetchFn, { packaged: false }))).resolves.toBe('skipped')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('baixa, troca o exe portátil e fecha quando a versão do host é mais nova', async () => {
    const fetchFn = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      if (url.endsWith('/updates/latest')) return jsonResponse(MANIFEST)
      return new Response('radcord', { status: 200, headers: { 'content-length': '7' } })
    })
    const launchSwap = vi.fn()
    const quit = vi.fn()
    const downloadDir = mkdtempSync(join(tmpdir(), 'radcord-update-'))
    const input = deps(fetchFn, { launchSwap, quit, downloadPath: join(downloadDir, 'Radcord-update.exe') })

    await expect(checkAndInstallUpdate(input)).resolves.toBe('installed')
    expect(launchSwap).toHaveBeenCalledOnce()
    expect(quit).toHaveBeenCalledOnce()
    rmSync(downloadDir, { recursive: true, force: true })
  })

  it('não baixa quando a pessoa recusa', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => jsonResponse(MANIFEST))
    const confirm = vi.fn<(version: string) => Promise<boolean>>().mockResolvedValue(false)

    await expect(checkAndInstallUpdate(deps(fetchFn, { confirm }))).resolves.toBe('declined')
    expect(fetchFn).toHaveBeenCalledOnce()
  })

  it('fica em silêncio quando o host não responde', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new Error('connect ECONNREFUSED')
    })

    await expect(checkAndInstallUpdate(deps(fetchFn))).resolves.toBe('unavailable')
  })
})

describe('assertHostBaseUrl', () => {
  it('aceita o endereço do Radmin e recusa caminho extra', () => {
    expect(assertHostBaseUrl('http://26.186.21.58:3000/')).toBe('http://26.186.21.58:3000')
    expect(() => assertHostBaseUrl('http://26.186.21.58:3000/updates')).toThrow(/26\.186\.21\.58:3000\/updates/)
  })
})

describe('assertUpdateBytes', () => {
  it('cita tamanho e hash quando o arquivo não confere', () => {
    expect(() => assertUpdateBytes(Buffer.from('outro'), MANIFEST)).toThrow(/5 bytes/)
  })
})

describe('portableSwapScript', () => {
  it('espera o processo sair e troca o exe que a pessoa abriu', () => {
    const script = portableSwapScript(412, "D:\\O'Brien\\novo.exe", 'D:\\Radcord.exe')

    expect(script).toContain('Wait-Process -Id 412')
    expect(script).toContain("'D:\\O''Brien\\novo.exe'")
    expect(script).not.toContain('process.execPath')
  })
})
