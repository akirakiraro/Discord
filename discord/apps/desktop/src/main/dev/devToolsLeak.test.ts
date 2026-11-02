import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SCRIPT = resolve(process.cwd(), '../../scripts/check-no-dev-tools.mjs')

function runCheck(files: Record<string, string>): { code: number; output: string } {
  const dir = mkdtempSync(join(tmpdir(), 'radcord-leak-'))
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true })
    writeFileSync(join(dir, name), text)
  }
  try {
    return { code: 0, output: execFileSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8', stdio: 'pipe' }) }
  } catch (error) {
    const failed = error as { status: number; stderr: string }
    return { code: failed.status, output: failed.stderr }
  }
}

describe('trava do instalador contra a área de testes', () => {
  it('build limpo passa', () => {
    const result = runCheck({ 'main/index.js': 'var DevBotsToggle = null;', 'renderer/index.html': '<div id="root">' })
    expect(result.code).toBe(0)
    expect(result.output).toMatch(/ok, 2 arquivos/)
  })

  it('qualquer pedaço da área de testes no build falha, com o arquivo e o texto', () => {
    const result = runCheck({
      'main/index.js': "ipcMain.handle('radcord:dev-bots', fn)",
      'preload/index.js': "exposeInMainWorld('radcordDev', {})",
      'renderer/assets/a.js': 'ok',
    })
    expect(result.code).toBe(1)
    expect(result.output).toContain('main/index.js: "radcord:dev-"')
    expect(result.output).toContain('preload/index.js: "radcordDev"')
  })

  it('pasta vazia ou ausente não passa calada', () => {
    expect(runCheck({}).code).toBe(2)
  })
})
