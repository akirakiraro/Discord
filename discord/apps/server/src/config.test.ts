import { describe, expect, it } from 'vitest'
import { loadServerConfig, type ServerEnv } from './config'

const VALID_ENV: ServerEnv = {
  LIVEKIT_API_KEY: 'radcord',
  LIVEKIT_API_SECRET: 'x'.repeat(40),
  LIVEKIT_PUBLIC_URL: 'ws://26.186.21.58:7880',
}

describe('loadServerConfig', () => {
  it('usa porta 3000, bind 0.0.0.0 e data/radcord.db por padrão', () => {
    const config = loadServerConfig(VALID_ENV)

    expect(config.port, 'porta padrão').toBe(3000)
    expect(config.bindHost, 'bind padrão').toBe('0.0.0.0')
    expect(config.databasePath).toBe('data/radcord.db')
  })

  it('respeita PORT, BIND_HOST e DATABASE_PATH informados', () => {
    const config = loadServerConfig({ ...VALID_ENV, PORT: '4000', BIND_HOST: '26.186.21.58', DATABASE_PATH: 'x/y.db' })

    expect(config.port).toBe(4000)
    expect(config.bindHost).toBe('26.186.21.58')
    expect(config.databasePath).toBe('x/y.db')
  })

  it('aponta a pasta de atualização do host e respeita UPDATES_DIR', () => {
    const dir = loadServerConfig(VALID_ENV).updatesDir.replaceAll('\\', '/')

    expect(dir, 'pasta padrão').toMatch(/infra\/host\/updates$/)
    expect(loadServerConfig({ ...VALID_ENV, UPDATES_DIR: 'D:/updates' }).updatesDir).toBe('D:/updates')
  })

  it('consulta o GitHub a cada 2 minutos e aceita RELEASE_POLL_MS', () => {
    expect(loadServerConfig(VALID_ENV).releasePollMs, 'padrão de 2 minutos').toBe(120_000)
    expect(loadServerConfig({ ...VALID_ENV, RELEASE_POLL_MS: '60000' }).releasePollMs).toBe(60_000)
  })

  it.each([
    [{ PORT: 'abc' }, /"abc"/],
    [{ LIVEKIT_API_KEY: undefined }, /LIVEKIT_API_KEY/],
    [{ LIVEKIT_API_SECRET: 'curto' }, /pelo menos 32/],
    [{ RELEASE_POLL_MS: '1' }, /"1"/],
    [{ LIVEKIT_PUBLIC_URL: 'http://x' }, /"http:\/\/x"/],
  ] as const)('falha quando %j', (patch, pattern) => {
    expect(() => loadServerConfig({ ...VALID_ENV, ...patch })).toThrow(pattern)
  })

  it('a rota do bot de teste só liga com RADCORD_DEV_TOOLS=1', () => {
    expect(loadServerConfig(VALID_ENV).devTools).toBe(false)
    expect(loadServerConfig({ ...VALID_ENV, RADCORD_DEV_TOOLS: '1' }).devTools).toBe(true)
    expect(loadServerConfig({ ...VALID_ENV, RADCORD_DEV_TOOLS: 'true' }).devTools).toBe(false)
    expect(loadServerConfig({ ...VALID_ENV, RADCORD_DEV_TOOLS: '0' }).devTools).toBe(false)
  })
})
