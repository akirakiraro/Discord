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

describe('arquivos de atualização do desktop', () => {
  let app: FastifyInstance
  let updatesDir = ''

  afterEach(async () => {
    await app.close()
    if (updatesDir) rmSync(updatesDir, { recursive: true, force: true })
  })

  async function start(): Promise<void> {
    updatesDir = mkdtempSync(join(tmpdir(), 'radcord-updates-'))
    const manifest = 'version: 0.1.38\n'
    writeFileSync(join(updatesDir, 'latest.yml'), manifest)
    const context = createServerContext({
      db: openDatabase(IN_MEMORY_DATABASE),
      tokenIssuer: new FakeVoiceTokenIssuer(),
      livekitPublicUrl: 'ws://26.186.21.58:7880',
      clock: systemClock,
      newId: randomIdGenerator,
    })
    app = await buildApp(context, { logger: false, updatesDir })
  }

  it('entrega o latest.yml sem login', async () => {
    await start()

    const response = await app.inject({ method: 'GET', url: '/updates/latest.yml' })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('0.1.38')
  })

  it('responde uma faixa do arquivo para o download por blocos', async () => {
    await start()

    const response = await app.inject({
      method: 'GET',
      url: '/updates/latest.yml',
      headers: { range: 'bytes=0-3' },
    })

    expect(response.statusCode).toBe(206)
    expect(response.headers['content-range']).toBe(`bytes 0-3/${Buffer.byteLength('version: 0.1.38\n')}`)
    expect(response.body).toBe('vers')
  })
})
