import { z } from 'zod'

export const CLIENT_REPORT_MESSAGE_MAX = 500
export const CLIENT_REPORT_DETAIL_MAX = 200

export const clientReportSchema = z.object({
  source: z.enum(['main', 'renderer']),
  message: z.string().trim().min(1).max(CLIENT_REPORT_MESSAGE_MAX),
  detail: z.string().trim().min(1).max(CLIENT_REPORT_DETAIL_MAX).optional(),
})

export type ClientReportRequest = z.infer<typeof clientReportSchema>

const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g

/**
 * Tira token e Bearer do texto antes de gravar ou enviar o relato.
 * Exemplo: `redactSecrets('access_token=abc')` devolve `'access_token=***'`.
 */
export function redactSecrets(text: string): string {
  return text.replace(/access_token=[^&\s]+/gi, 'access_token=***').replace(/Bearer\s+\S+/gi, 'Bearer ***').replace(JWT, '***')
}

/**
 * Uma linha só, já sem segredo, no tamanho que a API aceita.
 * Exemplo: `clipReportText('oi\\ntoken', 10)`
 */
export function clipReportText(text: string, max: number): string {
  const clean = redactSecrets(text).replace(/[\t\r\n]/g, ' ').trim()
  return clean.length <= max ? clean : clean.slice(0, max)
}
