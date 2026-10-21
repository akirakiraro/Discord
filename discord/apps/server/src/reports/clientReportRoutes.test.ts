import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { AuthResponse } from '@radcord/shared'
import { buildApp } from '../app'
import { IN_MEMORY_DATABASE, openDatabase } from '../db/database'
import { randomIdGenerator, type Clock } from '../platform/runtime'
import { createServerContext } from '../serverContext'
import type { VoiceTokenIssuer } from '../voice/voiceTokenIssuer'

const LIVEKIT_URL = 'ws://26.186.21.58:7880'
const FIXED_CLOCK: Clock = () => new Date('2026-10-21T18:00:00.000Z')

class UnusedTokenIssuer implements VoiceTokenIssuer {
  async issue(): Promise<string> {
    return 'unused'
  }
}

describe('POST /client-reports', () => {
  let app: FastifyInstance
  let reportsPath: string

  beforeEach(async () => {
    reportsPath = join(mkdtempSync(join(tmpdir(), 'radcord-report-route-')), 'client-reports.log')
    const context = createServerContext({
      db: openDatabase(IN_MEMORY_DATABASE),
      tokenIssuer: new UnusedTokenIssuer(),
      livekitPublicUrl: LIVEKIT_URL,
      clock: FIXED_CLOCK,
      newId: randomIdGenerator,
      clientReportsPath: reportsPath,
    })
    app = await buildApp(context, { logger: false })
  })

  afterEach(async () => {
    await app.close()
  })

  it('recusa sem sessão', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/client-reports',
      payload: { source: 'renderer', message: 'caiu' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('grava a linha com o usuário da sessão', async () => {
    const joined = await app.inject({ method: 'POST', url: '/auth/join', payload: { username: 'akira' } })
    const { token, user } = joined.json<AuthResponse>()

    const response = await app.inject({
      method: 'POST',
      url: '/client-reports',
      headers: { authorization: `Bearer ${token}` },
      payload: { source: 'renderer', message: 'Não foi possível entrar na call' },
    })

    expect(response.statusCode).toBe(204)
    const line = readFileSync(reportsPath, 'utf8')
    expect(line).toContain(user.id)
    expect(line).toContain('akira')
    expect(line).toContain('Não foi possível entrar na call')
  })
})
