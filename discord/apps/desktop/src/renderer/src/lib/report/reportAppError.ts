import { clipReportText, CLIENT_REPORT_DETAIL_MAX, CLIENT_REPORT_MESSAGE_MAX, type ClientReportRequest } from '@radcord/shared'
import { useSessionStore } from '../../stores/sessionStore'
import { flushClientReports, type ReportTransport } from './flushClientReports'

let reporting = false

/**
 * Envia o erro ao host. Sem sessão ou sem rede, a linha fica na fila do processo principal.
 * Exemplo: `reportAppError('Não foi possível entrar na call', 'ws://26.186.21.58:7880')`
 */
export function reportAppError(message: string, detail?: string, source: ClientReportRequest['source'] = 'renderer'): void {
  if (reporting) return
  const report = buildReport(source, message, detail)
  if (!report) return
  reporting = true
  void flushClientReports(browserTransport(), report).finally(() => {
    reporting = false
  })
}

function buildReport(source: ClientReportRequest['source'], message: string, detail?: string): ClientReportRequest | null {
  const clipped = clipReportText(message, CLIENT_REPORT_MESSAGE_MAX)
  if (!clipped) return null
  const extra = detail ? clipReportText(detail, CLIENT_REPORT_DETAIL_MAX) : ''
  return extra ? { source, message: clipped, detail: extra } : { source, message: clipped }
}

function browserTransport(): ReportTransport {
  const bridge = typeof window === 'undefined' ? undefined : window.radcord
  return {
    post(report) {
      const api = useSessionStore.getState().session?.api
      if (!api) throw new Error('sem sessão para enviar o relato')
      return api.reportClient(report)
    },
    takeQueued: () => bridge?.takeQueuedReports() ?? Promise.resolve([]),
    saveQueued: (reports) => bridge?.saveQueuedReports(reports) ?? Promise.resolve(),
  }
}

/** Escuta erro da janela e o que o processo principal encaminha. */
export function installClientReports(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (event) => reportAppError(event.message))
  window.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason
    reportAppError(reason instanceof Error ? reason.message : String(reason))
  })
  window.radcord?.onMainReport((message) => reportAppError(message, undefined, 'main'))
}
