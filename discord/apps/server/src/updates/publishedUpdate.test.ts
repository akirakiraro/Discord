import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readPublishedDesktopUpdate } from './publishedUpdate'

const HASH = createHash('sha256').update('radcord').digest('hex')
const dirs: string[] = []

function publish(dir: string, size = 7): void {
  writeFileSync(join(dir, 'Radcord.exe'), 'radcord')
  writeFileSync(join(dir, 'latest.json'), JSON.stringify({ version: '0.1.37', sha256: HASH, size }))
}

describe('readPublishedDesktopUpdate', () => {
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs.length = 0
  })

  it('devolve null quando ainda não há versão publicada', () => {
    const dir = mkdtempSync(join(tmpdir(), 'radcord-update-'))
    dirs.push(dir)

    expect(readPublishedDesktopUpdate(dir)).toBeNull()
  })

  it('lê o manifesto quando o tamanho do exe confere', () => {
    const dir = mkdtempSync(join(tmpdir(), 'radcord-update-'))
    dirs.push(dir)
    publish(dir)

    expect(readPublishedDesktopUpdate(dir)?.manifest.version).toBe('0.1.37')
  })

  it('cita os dois tamanhos quando o exe não bate com o manifesto', () => {
    const dir = mkdtempSync(join(tmpdir(), 'radcord-update-'))
    dirs.push(dir)
    publish(dir, 3)

    expect(() => readPublishedDesktopUpdate(dir)).toThrow(/7 bytes, esperado 3/)
  })
})
