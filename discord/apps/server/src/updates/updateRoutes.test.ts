import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../app'
import { IN_MEMORY_DATABASE, openDatabase } from '../db/database'
import { randomIdGenerator, systemClock } from '../platform/runtime'
import { createServerContext } from '../serverContext'
import type { VoiceGrantRequest, VoiceTokenIssuer } from '../voice/voiceTokenIssuer'

class FakeVoiceTokenIssuer implements VoiceTokenIssuer {
  async issue(request: VoiceGrantRequest): Promise<string> {
    return `fake-token-${request.identity}`
  }
}

describe('rotas de atualização do desktop', () => {
  let app: FastifyInstance
  let updatesDir = ''

  afterEach(async () => {
    await app.close()
    if (updatesDir) rmSync(updatesDir, { recursive: true, force: true })
  })

  async function start(withPackage: boolean): Promise<void> {
    updatesDir = mkdtempSync(join(tmpdir(), 'radcord-updates-'))
    if (withPackage) writePackage(updatesDir)
    const context = createServerContext({
      db: openDatabase(IN_MEMORY_DATABASE),
      tokenIssuer: new FakeVoiceTokenIssuer(),
      livekitPublicUrl: 'ws://26.186.21.58:7880',
      clock: systemClock,
      newId: randomIdGenerator,
    })
    app = await buildApp(context, { logger: false, updatesDir })
  }

  it('responde 404 sem login quando nada foi publicado', async () => {
    await start(false)

    const response = await app.inject({ method: 'GET', url: '/updates/latest' })

    expect(response.statusCode).toBe(404)
    expect(response.json().error).toBe('not_found')
  })

  it('entrega o manifesto e o exe sem token', async () => {
    await start(true)

    const manifest = await app.inject({ method: 'GET', url: '/updates/latest' })
    const file = await app.inject({ method: 'GET', url: '/updates/Radcord.exe' })

    expect(manifest.statusCode, 'manifesto').toBe(200)
    expect(manifest.json().version).toBe('0.1.37')
    expect(file.statusCode, 'exe').toBe(200)
    expect(file.body).toBe('radcord')
  })
})

function writePackage(dir: string): void {
  const bytes = 'radcord'
  writeFileSync(join(dir, 'Radcord.exe'), bytes)
  writeFileSync(join(dir, 'latest.json'), JSON.stringify({
    version: '0.1.37',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    size: bytes.length,
  }))
}
