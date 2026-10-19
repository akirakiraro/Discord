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

  it('respeita PORT e BIND_HOST informados', () => {
    const config = loadServerConfig({ ...VALID_ENV, PORT: '4000', BIND_HOST: '26.186.21.58' })

    expect(config.port).toBe(4000)
    expect(config.bindHost).toBe('26.186.21.58')
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

  it('falha quando a URL pública não é websocket', () => {
    expect(() => loadServerConfig({ ...VALID_ENV, LIVEKIT_PUBLIC_URL: 'http://x' })).toThrow(/"http:\/\/x"/)
  })
})
