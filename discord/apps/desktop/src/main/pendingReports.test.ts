import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { enqueuePendingReport, readPendingReports, toPendingReport, writePendingReports } from './pendingReports'

describe('pendingReports', () => {
  it('tira o token e descarta mensagem vazia', () => {
    expect(toPendingReport('renderer', 'access_token=segredo')?.message).toBe('access_token=***')
    expect(toPendingReport('main', '   ')).toBeNull()
  })

  it('arquivo quebrado lê como fila vazia e o corte fica em 20', () => {
    const dir = mkdtempSync(join(tmpdir(), 'radcord-pending-'))
    const filePath = join(dir, 'pending-reports.json')
    writePendingReports(filePath, [])
    expect(readPendingReports(join(dir, 'ausente.json'))).toEqual([])

    const reports = Array.from({ length: 25 }, (_, index) => ({ source: 'renderer' as const, message: `e${index}` }))
    writePendingReports(filePath, reports)

    const stored = JSON.parse(readFileSync(filePath, 'utf8')) as { message: string }[]
    expect(stored).toHaveLength(20)
    expect(stored[0]?.message).toBe('e5')
  })

  it('acrescenta na fila que já existia', () => {
    const filePath = join(mkdtempSync(join(tmpdir(), 'radcord-pending-')), 'pending-reports.json')
    const first = toPendingReport('main', 'janela caiu')
    const second = toPendingReport('renderer', 'call caiu')
    if (!first || !second) throw new Error('relatos de teste vazios')

    enqueuePendingReport(filePath, first)
    enqueuePendingReport(filePath, second)

    expect(readPendingReports(filePath)).toEqual([first, second])
  })
})
