import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { nodeImportSpecifier } from './hostLaunch'

const loader = fileURLToPath(new URL('../../../../../node_modules/tsx/dist/loader.mjs', import.meta.url))
const rawWindowsLoader = 'C:\\Users\\Akira\\Documents\\GitHub\\Discord\\discord\\node_modules\\tsx\\dist\\loader.mjs'

describe('node --import de verdade', () => {
  it('sobe um entry mínimo com a file URL do tsx e recusa o caminho C:\\', () => {
    const root = mkdtempSync(join(tmpdir(), 'host-import-'))
    const dir = join(root, 'Program Files')
    const entry = join(dir, 'entry.ts')
    const database = join(dir, 'radcord.db')
    mkdirSync(dir)
    writeFileSync(entry, 'console.log(`host-import-ok ${process.env.DATABASE_PATH}`)\n')
    try {
      expect(nodeImportSpecifier(loader)).toBe(pathToFileURL(loader).href)
      const stdout = execFileSync(process.execPath, ['--import', nodeImportSpecifier(loader), entry], {
        cwd: dir,
        encoding: 'utf8',
        env: { ...process.env, DATABASE_PATH: database },
      })
      expect(stdout.trim()).toBe(`host-import-ok ${database}`)

      let failed = false
      try {
        execFileSync(process.execPath, ['--import', rawWindowsLoader, entry], {
          cwd: dir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } catch (error: unknown) {
        failed = true
        const crash = error as { status?: number; stderr?: string }
        expect(crash.status).not.toBe(0)
        expect(crash.stderr ?? '').toContain('ERR_UNSUPPORTED_ESM_URL_SCHEME')
        expect(crash.stderr ?? '').toContain("protocol 'c:'")
      }
      expect(failed).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
