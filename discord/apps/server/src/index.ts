import { buildApp } from './app'
import { loadServerConfig, type ServerEnv } from './config'
import { openDatabase } from './db/database'
import { randomIdGenerator, systemClock } from './platform/runtime'
import { attachRealtimeGateway } from './realtime/realtimeGateway'
import { createServerContext } from './serverContext'
import { clientReportsBeside } from './reports/clientReportLog'
import { LiveKitTokenIssuer } from './voice/voiceTokenIssuer'

async function startServer(env: ServerEnv): Promise<void> {
  const config = loadServerConfig(env)
  const context = createServerContext({
    db: openDatabase(config.databasePath),
    tokenIssuer: new LiveKitTokenIssuer(config.livekitApiKey, config.livekitApiSecret),
    livekitPublicUrl: config.livekitPublicUrl,
    clock: systemClock,
    newId: randomIdGenerator,
    clientReportsPath: clientReportsBeside(config.databasePath),
  })
  const app = await buildApp(context, { logger: true, updatesDir: config.updatesDir })
  context.broadcaster.attach(attachRealtimeGateway(app.server, context))
  await app.listen({ host: config.bindHost, port: config.port })
  app.log.info({ event: 'database_opened', path: config.databasePath })
}

startServer(process.env).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ event: 'server_start_failed', message }))
  process.exit(1)
})
