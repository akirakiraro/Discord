import { ipcMain, type BrowserWindow } from 'electron'
import { clientReportSchema, clipReportText, CLIENT_REPORT_MESSAGE_MAX } from '@radcord/shared'
import { enqueuePendingReport, readPendingReports, toPendingReport, writePendingReports } from './pendingReports'

const ABORTED_LOAD = -3

/**
 * Liga a fila em disco e os erros do processo principal.
 * Exemplo: `bindClientReports(window, join(app.getPath('userData'), 'pending-reports.json'))`
 */
export function bindClientReports(window: BrowserWindow, queuePath: string): void {
  ipcMain.handle('radcord:take-reports', () => takeQueue(queuePath))
  ipcMain.handle('radcord:queue-reports', (_event, body: unknown) => storeQueue(queuePath, body))
  listenForMainFailures(window, queuePath)
}

function takeQueue(queuePath: string): ReturnType<typeof readPendingReports> {
  const pending = readPendingReports(queuePath)
  writePendingReports(queuePath, [])
  return pending
}

function storeQueue(queuePath: string, body: unknown): void {
  const parsed = clientReportSchema.array().max(20).safeParse(body)
  if (!parsed.success) return
  writePendingReports(queuePath, parsed.data)
}

function listenForMainFailures(window: BrowserWindow, queuePath: string): void {
  const send = (message: string): void => forwardOrKeep(window, queuePath, message)
  process.on('uncaughtException', (error) => send(error.message))
  process.on('unhandledRejection', (reason: unknown) => send(reasonText(reason)))
  window.webContents.on('unresponsive', () => send('A janela do Radcord travou'))
  window.webContents.on('render-process-gone', (_event, details) => keep(queuePath, `O renderer caiu: ${details.reason}`))
  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, _url, isMainFrame) => {
    if (!isMainFrame || errorCode === ABORTED_LOAD) return
    send(`Falha ao carregar a janela (${errorCode}): ${errorDescription}`)
  })
}

function forwardOrKeep(window: BrowserWindow, queuePath: string, message: string): void {
  if (window.isDestroyed()) {
    keep(queuePath, message)
    return
  }
  window.webContents.send('radcord:main-report', clipReportText(message, CLIENT_REPORT_MESSAGE_MAX))
}

function keep(queuePath: string, message: string): void {
  const report = toPendingReport('main', message)
  if (report) enqueuePendingReport(queuePath, report)
}

function reasonText(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}
