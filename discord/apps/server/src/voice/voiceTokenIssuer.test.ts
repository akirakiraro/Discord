import { describe, expect, it } from 'vitest'
import { TokenVerifier } from 'livekit-server-sdk'
import { LiveKitTokenIssuer } from './voiceTokenIssuer'

const API_KEY = 'radcord-test'
const API_SECRET = 's'.repeat(40)

describe('LiveKitTokenIssuer', () => {
  it('assina token com identidade, nome e acesso só à sala pedida', async () => {
    const issuer = new LiveKitTokenIssuer(API_KEY, API_SECRET)

    const jwt = await issuer.issue({ roomName: 'canal-1', identity: 'user-1', displayName: 'Akira', canPublish: true, hidden: false })
    const claims = await new TokenVerifier(API_KEY, API_SECRET).verify(jwt)

    expect(claims.sub, 'identidade').toBe('user-1')
    expect(claims.name, 'nome exibido').toBe('Akira')
    expect(claims.video?.room, 'sala liberada').toBe('canal-1')
    expect(claims.video?.roomJoin, 'permissão de entrar').toBe(true)
    expect(claims.video?.canPublish, 'pode publicar').toBe(true)
    expect(claims.video?.hidden, 'visível na sala').toBe(false)
  })

  it('token assinado com outro segredo não é aceito', async () => {
    const jwt = await new LiveKitTokenIssuer(API_KEY, API_SECRET).issue({
      roomName: 'x',
      identity: 'u',
      displayName: 'U',
      canPublish: false,
      hidden: true,
    })

    await expect(new TokenVerifier(API_KEY, 'o'.repeat(40)).verify(jwt)).rejects.toThrow()
  })
})
