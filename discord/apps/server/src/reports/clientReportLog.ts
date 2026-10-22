import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { redactSecrets, type ClientReportRequest } from '@radcord/shared'

export const CLIENT_REPORT_MAX_BYTES = 1_048_576

export interface ClientReportLine {
  at: Date
  userId: string
  displayName: string
  report: ClientReportRequest
}

/**
 * O relato fica ao lado do banco, na pasta de dados do host.
 * Exemplo: `clientReportsBeside('C:/radcord/data/radcord.db')`
 */
export function clientReportsBeside(databasePath: string): string {
  return join(dirname(databasePath), 'client-reports.log')
}

/**
 * Uma linha: data, usuário, origem e mensagem. Segredo vira `***`.
 * Exemplo: `formatClientReport({ at, userId, displayName, report })`
 */
export function formatClientReport(line: ClientReportLine): string {
  const parts = [
    line.at.toISOString(),
    singleLine(line.userId),
    singleLine(line.displayName),
    line.report.source,
    singleLine(redactSecrets(line.report.message)),
  ]
  if (line.report.detail) parts.push(singleLine(redactSecrets(line.report.detail)))
  return parts.join('\t')
}

function singleLine(value: string): string {
  return value.replace(/[\t\r\n]/g, ' ')
}

/**
 * Acrescenta a linha. Passou de 1 MB, o arquivo atual vira `client-reports.1.log`.
 * Exemplo: `appendClientReport(path, line)`
 */
export function appendClientReport(filePath: string, line: string, maxBytes = CLIENT_REPORT_MAX_BYTES): void {
  const text = `${line}\n`
  mkdirSync(dirname(filePath), { recursive: true })
  rotateIfFull(filePath, Buffer.byteLength(text), maxBytes)
  appendFileSync(filePath, text)
}

function rotateIfFull(filePath: string, incoming: number, maxBytes: number): void {
  if (!existsSync(filePath)) return
  if (statSync(filePath).size + incoming <= maxBytes) return
  renameSync(filePath, filePath.replace(/\.log$/, '.1.log'))
}
