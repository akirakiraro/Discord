import type { ClientReportRequest } from '@radcord/shared'

export interface ReportTransport {
  post(report: ClientReportRequest): Promise<void>
  takeQueued(): Promise<ClientReportRequest[]>
  saveQueued(reports: ClientReportRequest[]): Promise<void>
}

/**
 * Manda a fila e o relato novo. O que o host não aceitar volta para a fila.
 * Exemplo: `await flushClientReports(transport, { source: 'renderer', message: 'caiu' })`
 */
export async function flushClientReports(transport: ReportTransport, next: ClientReportRequest): Promise<void> {
  const queued = await transport.takeQueued().catch(() => [])
  const failed: ClientReportRequest[] = []
  for (const report of [...queued, next]) {
    try {
      await transport.post(report)
    } catch {
      failed.push(report)
    }
  }
  if (failed.length > 0) await transport.saveQueued(failed.slice(-20))
}
