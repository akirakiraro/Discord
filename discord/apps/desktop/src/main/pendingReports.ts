import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { clipReportText, CLIENT_REPORT_DETAIL_MAX, CLIENT_REPORT_MESSAGE_MAX, type ClientReportRequest } from '@radcord/shared'

export const PENDING_REPORT_LIMIT = 20

/**
 * Relato já cortado e sem segredo, ou null se a mensagem ficou vazia.
 * Exemplo: `toPendingReport('renderer', 'caiu', 'ws://26.186.21.58:7880')`
 */
export function toPendingReport(source: ClientReportRequest['source'], message: string, detail?: string): ClientReportRequest | null {
  const clipped = clipReportText(message, CLIENT_REPORT_MESSAGE_MAX)
  if (!clipped) return null
  const extra = detail ? clipReportText(detail, CLIENT_REPORT_DETAIL_MAX) : ''
  return extra ? { source, message: clipped, detail: extra } : { source, message: clipped }
}

/**
 * Lê a fila local. Arquivo ausente ou quebrado vira lista vazia.
 * Exemplo: `readPendingReports(path)`
 */
export function readPendingReports(filePath: string): ClientReportRequest[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'))
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap(asReport)
  } catch {
    return []
  }
}

function asReport(value: unknown): ClientReportRequest[] {
  if (!value || typeof value !== 'object') return []
  const record = value as { source?: unknown; message?: unknown; detail?: unknown }
  if (record.source !== 'main' && record.source !== 'renderer') return []
  if (typeof record.message !== 'string') return []
  const detail = typeof record.detail === 'string' ? record.detail : undefined
  const report = toPendingReport(record.source, record.message, detail)
  return report ? [report] : []
}

/**
 * Guarda no máximo as últimas 20 linhas. O host fora do ar não enche o disco.
 * Exemplo: `writePendingReports(path, reports)`
 */
export function writePendingReports(filePath: string, reports: ClientReportRequest[]): void {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(reports.slice(-PENDING_REPORT_LIMIT)))
}

/** Acrescenta um relato na fila que o renderer reenvia depois. */
export function enqueuePendingReport(filePath: string, report: ClientReportRequest): void {
  writePendingReports(filePath, [...readPendingReports(filePath), report])
}
