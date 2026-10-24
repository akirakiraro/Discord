import { describe, expect, it } from 'vitest'
import { loadServerConfig, type ServerEnv } from './config'

const VALID_ENV: ServerEnv = {
  LIVEKIT_API_KEY: 'radcord',
  LIVEKIT_API_SECRET: 'x'.repeat(40),
  LIVEKIT_PUBLIC_URL: 'ws://26.186.21.58:7880',
}

describe('loadServerConfig', () => {
  it('usa porta 3000 e bind 0.0.0.0 por padrão', () => {
    const config = loadServerConfig(VALID_ENV)

    expect(config.port, 'porta padrão').toBe(3000)
    expect(config.bindHost, 'bind padrão').toBe('0.0.0.0')
  })

  it('respeita PORT, BIND_HOST e DATABASE_PATH informados', () => {
    const config = loadServerConfig({ ...VALID_ENV, PORT: '4000', BIND_HOST: '26.186.21.58', DATABASE_PATH: 'x/y.db' })

    expect(config.port).toBe(4000)
    expect(config.bindHost).toBe('26.186.21.58')
    expect(config.databasePath).toBe('x/y.db')
  })

  it('usa data/radcord.db como banco padrão', () => {
    expect(loadServerConfig(VALID_ENV).databasePath).toBe('data/radcord.db')
  })

  it('aponta a pasta de atualização do host e respeita UPDATES_DIR', () => {
    const dir = loadServerConfig(VALID_ENV).updatesDir.replaceAll('\\', '/')

    expect(dir, 'pasta padrão').toMatch(/infra\/host\/updates$/)
    expect(loadServerConfig({ ...VALID_ENV, UPDATES_DIR: 'D:/updates' }).updatesDir).toBe('D:/updates')
  })

  it('falha mostrando o valor quando a porta é inválida', () => {
    expect(() => loadServerConfig({ ...VALID_ENV, PORT: 'abc' })).toThrow(/"abc"/)
  })

  it('falha quando a chave do LiveKit está ausente', () => {
    expect(() => loadServerConfig({ ...VALID_ENV, LIVEKIT_API_KEY: undefined })).toThrow(/LIVEKIT_API_KEY/)
  })

  it('falha quando o segredo é curto demais', () => {
    expect(() => loadServerConfig({ ...VALID_ENV, LIVEKIT_API_SECRET: 'curto' })).toThrow(/pelo menos 32/)
  })

  it('consulta o GitHub a cada 2 minutos e aceita RELEASE_POLL_MS', () => {
    expect(loadServerConfig(VALID_ENV).releasePollMs, 'padrão de 2 minutos').toBe(120_000)
    expect(loadServerConfig({ ...VALID_ENV, RELEASE_POLL_MS: '60000' }).releasePollMs).toBe(60_000)
  })

  it('falha mostrando o valor quando o intervalo da release é inválido', () => {
    expect(() => loadServerConfig({ ...VALID_ENV, RELEASE_POLL_MS: '1' })).toThrow(/"1"/)
  })

  it('falha quando a URL pública não é websocket', () => {
    expect(() => loadServerConfig({ ...VALID_ENV, LIVEKIT_PUBLIC_URL: 'http://x' })).toThrow(/"http:\/\/x"/)
  })
})
