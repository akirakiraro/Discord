import { describe, expect, it } from 'vitest'
import { TokenVerifier } from 'livekit-server-sdk'
import { LiveKitTokenIssuer, buildParticipantIdentity } from './voiceTokenIssuer'

const API_KEY = 'radcord-test'
const API_SECRET = 's'.repeat(40)

describe('buildParticipantIdentity', () => {
  it('junta o nome com o sufixo informado', () => {
    expect(buildParticipantIdentity('Akira', 'ab12cd34')).toBe('Akira#ab12cd34')
  })

  it('gera sufixos diferentes para o mesmo nome', () => {
    const first = buildParticipantIdentity('Akira')
    const second = buildParticipantIdentity('Akira')

    expect(first, 'duas conexões com o mesmo nome precisam de identidades distintas').not.toBe(second)
  })
})

describe('LiveKitTokenIssuer', () => {
  it('assina um token com nome e permissão de entrar só na sala pedida', async () => {
    const issuer = new LiveKitTokenIssuer(API_KEY, API_SECRET)

    const jwt = await issuer.issue({ displayName: 'Akira', roomName: 'geral' })
    const claims = await new TokenVerifier(API_KEY, API_SECRET).verify(jwt)

    expect(claims.name, 'nome exibido').toBe('Akira')
    expect(claims.sub, 'identidade começa com o nome').toMatch(/^Akira#/)
    expect(claims.video?.room, 'sala liberada').toBe('geral')
    expect(claims.video?.roomJoin, 'permissão de entrar').toBe(true)
  })
})
