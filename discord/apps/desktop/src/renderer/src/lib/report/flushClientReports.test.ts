import { describe, expect, it } from 'vitest'
import type { ClientReportRequest } from '@radcord/shared'
import { flushClientReports, type ReportTransport } from './flushClientReports'

const NEXT: ClientReportRequest = { source: 'renderer', message: 'caiu' }

describe('flushClientReports', () => {
  it('envia a fila antiga antes do relato novo', async () => {
    const posted: string[] = []
    const transport = fakeTransport(posted, [{ source: 'main', message: 'antigo' }])

    await flushClientReports(transport, NEXT)

    expect(posted).toEqual(['antigo', 'caiu'])
    expect(transport.saved).toEqual([])
  })

  it('o que o host recusou volta para a fila', async () => {
    const posted: string[] = []
    const transport = fakeTransport(posted, [{ source: 'renderer', message: 'antigo' }])
    transport.fail.add('caiu')

    await flushClientReports(transport, NEXT)

    expect(posted).toEqual(['antigo'])
    expect(transport.saved[0]?.map((report) => report.message)).toEqual(['caiu'])
  })
})

function fakeTransport(posted: string[], queued: ClientReportRequest[]): ReportTransport & { saved: ClientReportRequest[][]; fail: Set<string> } {
  const fail = new Set<string>()
  const saved: ClientReportRequest[][] = []
  return {
    fail,
    saved,
    async post(report) {
      if (fail.has(report.message)) throw new Error(`host recusou ${report.message}`)
      posted.push(report.message)
    },
    async takeQueued() {
      return queued
    },
    async saveQueued(reports) {
      saved.push(reports)
    },
  }
}
