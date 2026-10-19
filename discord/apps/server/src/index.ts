import { buildApp } from './app'
import { loadServerConfig, type ServerEnv } from './config'
import { LiveKitTokenIssuer } from './voiceTokenIssuer'

async function startServer(env: ServerEnv): Promise<void> {
  const config = loadServerConfig(env)
  const tokenIssuer = new LiveKitTokenIssuer(config.livekitApiKey, config.livekitApiSecret)
  const app = await buildApp({ livekitPublicUrl: config.livekitPublicUrl, tokenIssuer, logger: true })
  await app.listen({ host: config.bindHost, port: config.port })
}

startServer(process.env).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ event: 'server_start_failed', message }))
  process.exit(1)
})
