import type { FastifyInstance } from 'fastify'
import { clientReportSchema } from '@radcord/shared'
import type { AuthService } from '../auth/authService'
import { requireCurrentUser } from '../http/currentUser'
import { parseRequest } from '../http/httpError'
import type { Clock } from '../platform/runtime'
import { appendClientReport, formatClientReport } from './clientReportLog'

/**
 * O app manda o erro para cá; a linha fica no disco do host.
 * Exemplo: `registerClientReportRoutes(app, auth, reportsPath, clock)` → POST /client-reports
 */
export function registerClientReportRoutes(app: FastifyInstance, auth: AuthService, reportsPath: string, clock: Clock): void {
  app.post('/client-reports', async (request, reply) => {
    const user = requireCurrentUser(request, auth)
    const report = parseRequest(clientReportSchema, request.body)
    const line = formatClientReport({ at: clock(), userId: user.id, displayName: user.displayName, report })
    appendClientReport(reportsPath, line)
    return reply.code(204).send()
  })
}
