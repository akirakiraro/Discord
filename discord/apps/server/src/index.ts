import { buildApp } from './app'
import { loadServerConfig, type ServerConfig, type ServerEnv } from './config'
import { openDatabase } from './db/database'
import { randomIdGenerator, systemClock } from './platform/runtime'
import { attachRealtimeGateway } from './realtime/realtimeGateway'
import type { SocketIoBroadcaster } from './realtime/realtimeBroadcaster'
import { createServerContext } from './serverContext'
import { clientReportsBeside } from './reports/clientReportLog'
import { createGithubReleaseLookup, ReleasePoller, startReleasePoller } from './updates/releasePoller'
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
  const releases = watchReleases(config, context.broadcaster)
  const app = await buildApp(context, { logger: true, updatesDir: config.updatesDir, devTools: config.devTools })
  if (config.devTools) app.log.warn({ event: 'dev_tools_enabled' }, 'RADCORD_DEV_TOOLS=1: rota do bot de teste ligada')
  const gateway = attachRealtimeGateway(app.server, {
    ...context,
    knownRelease: () => releases.currentVersion(),
  })
  context.broadcaster.attach(gateway)
  await app.listen({ host: config.bindHost, port: config.port })
  app.log.info({ event: 'database_opened', path: config.databasePath })
}

function watchReleases(config: ServerConfig, broadcaster: SocketIoBroadcaster): ReleasePoller {
  const poller = new ReleasePoller(createGithubReleaseLookup(), {
    announce(version) {
      broadcaster.emit('app:release', { version })
    },
  })
  startReleasePoller(poller, config.releasePollMs)
  return poller
}

startServer(process.env).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ event: 'server_start_failed', message }))
  process.exit(1)
})
