import { mkdirSync } from 'node:fs'
import fastifyStatic from '@fastify/static'
import type { FastifyInstance } from 'fastify'

/**
 * Serve `latest.yml`, o instalador e o blockmap. O Range deixa o electron-updater pedir só os blocos novos.
 * Exemplo: `await registerUpdateStatic(app, 'infra/host/updates')`
 */
export async function registerUpdateStatic(app: FastifyInstance, updatesDir: string): Promise<void> {
  if (!updatesDir.trim()) return
  mkdirSync(updatesDir, { recursive: true })
  await app.register(fastifyStatic, {
    root: updatesDir,
    prefix: '/updates/',
    decorateReply: false,
    index: false,
    acceptRanges: true,
  })
}
