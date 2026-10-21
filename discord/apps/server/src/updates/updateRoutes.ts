import { createReadStream } from 'node:fs'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { DESKTOP_UPDATE_DOWNLOAD_PATH, DESKTOP_UPDATE_MANIFEST_PATH, type ApiErrorResponse } from '@radcord/shared'
import { readPublishedDesktopUpdate, type PublishedDesktopUpdate } from './publishedUpdate'

const NOT_PUBLISHED: ApiErrorResponse = { error: 'not_found', message: 'Nenhuma versão do Radcord publicada' }

/**
 * Serve o manifesto e o executável sem login, para o app se atualizar antes de entrar.
 * Exemplo: `registerUpdateRoutes(app, 'infra/host/updates')`
 */
export function registerUpdateRoutes(app: FastifyInstance, updatesDir: string): void {
  app.get(DESKTOP_UPDATE_MANIFEST_PATH, async (_request, reply) => {
    const published = loadPublished(updatesDir)
    if (!published) return reply.code(404).send(NOT_PUBLISHED)
    return published.manifest
  })

  app.get(DESKTOP_UPDATE_DOWNLOAD_PATH, async (_request, reply) => {
    const published = loadPublished(updatesDir)
    if (!published) return reply.code(404).send(NOT_PUBLISHED)
    return sendPackage(reply, published)
  })
}

function loadPublished(updatesDir: string): PublishedDesktopUpdate | null {
  if (!updatesDir.trim()) return null
  return readPublishedDesktopUpdate(updatesDir)
}

function sendPackage(reply: FastifyReply, published: PublishedDesktopUpdate): FastifyReply {
  return reply
    .header('content-type', 'application/octet-stream')
    .header('content-length', published.manifest.size)
    .send(createReadStream(published.filePath))
}
