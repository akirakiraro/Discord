import { describe, expect, it } from 'vitest'
import { apiEnvironment, ensureLiveKitSecret, formatLiveKitSecret, killTreeCommand, liveKitYaml } from './hostLaunch'

describe('plano de subida do host', () => {
  it('gera o segredo de 36 bytes e reusa o que já tem 32', () => {
    const bytes = Uint8Array.from({ length: 36 }, () => 7)

    expect(formatLiveKitSecret(bytes)).toBe('BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcH')
    expect(ensureLiveKitSecret('curto', () => bytes)).toBe('BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcH')
    expect(ensureLiveKitSecret('a'.repeat(32), () => bytes)).toBe('a'.repeat(32))
  })

  it('grava o YAML preso ao 26.186.21.58', () => {
    expect(liveKitYaml('26.186.21.58', 'segredo-de-teste-com-32-caracteres')).toBe(
      [
        'port: 7880',
        'bind_addresses:',
        '  - "26.186.21.58"',
        'rtc:',
        '  tcp_port: 7881',
        '  port_range_start: 50000',
        '  port_range_end: 50100',
        '  use_external_ip: false',
        '  node_ip: "26.186.21.58"',
        '  ips:',
        '    includes:',
        '      - 26.0.0.0/8',
        'keys:',
        '  radcord: "segredo-de-teste-com-32-caracteres"',
        'logging:',
        '  level: info',
        '',
      ].join('\n'),
    )
  })

  it('monta o ambiente da API e o taskkill da árvore', () => {
    expect(apiEnvironment('26.186.21.58', 'segredo-de-teste-com-32-caracteres', '/repo/data/radcord.db')).toEqual({
      BIND_HOST: '26.186.21.58',
      PORT: '3000',
      DATABASE_PATH: '/repo/data/radcord.db',
      LIVEKIT_API_KEY: 'radcord',
      LIVEKIT_API_SECRET: 'segredo-de-teste-com-32-caracteres',
      LIVEKIT_PUBLIC_URL: 'ws://26.186.21.58:7880',
    })
    expect(killTreeCommand(4242, 'win32')).toEqual({ file: 'taskkill', args: ['/PID', '4242', '/T', '/F'] })
    expect(killTreeCommand(4242, 'linux')).toEqual({ file: 'kill', args: ['-TERM', '4242'] })
    expect(() => killTreeCommand(0, 'win32')).toThrow(/pid 0/)
  })
})
