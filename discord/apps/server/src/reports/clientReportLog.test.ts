import { mkdtempSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { appendClientReport, formatClientReport } from './clientReportLog'

const AT = new Date('2026-10-21T18:00:00.000Z')

describe('clientReportLog', () => {
  it('monta a linha com usuário e sem o token', () => {
    const line = formatClientReport({
      at: AT,
      userId: 'user-1',
      displayName: 'Akira',
      report: {
        source: 'renderer',
        message: 'falha access_token=segredo Bearer abc.def.ghi',
        detail: 'ws://26.186.21.58:7880',
      },
    })

    expect(line).toContain('2026-10-21T18:00:00.000Z\tuser-1\tAkira\trenderer\t')
    expect(line).toContain('access_token=***')
    expect(line).toContain('Bearer ***')
    expect(line).not.toContain('segredo')
    expect(line.endsWith('ws://26.186.21.58:7880')).toBe(true)
  })

  it('passa de 1 MB e o arquivo atual vira o anterior', () => {
    const dir = mkdtempSync(join(tmpdir(), 'radcord-reports-'))
    const filePath = join(dir, 'client-reports.log')

    appendClientReport(filePath, 'primeira', 12)
    appendClientReport(filePath, 'segunda linha longa', 12)

    expect(readFileSync(join(dir, 'client-reports.1.log'), 'utf8')).toBe('primeira\n')
    expect(readFileSync(filePath, 'utf8')).toBe('segunda linha longa\n')
    expect(statSync(filePath).size).toBeGreaterThan(0)
  })
})
