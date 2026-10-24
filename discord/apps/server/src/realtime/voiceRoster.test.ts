import { describe, expect, it } from 'vitest'
import { VoiceRoster, type VoiceSeat } from './voiceRoster'

const CHANNEL_A = '6f1c2b7e-1d1a-4c55-9b8e-3a2f4d5e6f70'
const CHANNEL_B = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

function seat(userId: string, socketId: string, channelId: string, displayName: string): VoiceSeat {
  return { userId, socketId, channelId, displayName }
}

describe('VoiceRoster', () => {
  it('entra no canal e o snapshot guarda a ordem', () => {
    const roster = new VoiceRoster()

    const move = roster.join(seat('u-1', 's-1', CHANNEL_A, 'Akira'))
    roster.join(seat('u-2', 's-2', CHANNEL_A, 'Bia'))

    expect(move.joined).toEqual({ channelId: CHANNEL_A, userId: 'u-1', displayName: 'Akira' })
    expect(move.left).toBeNull()
    expect(roster.snapshot().map((occupant) => occupant.userId)).toEqual(['u-1', 'u-2'])
  })

  it('repetir o mesmo assento não gera evento', () => {
    const roster = new VoiceRoster()
    roster.join(seat('u-1', 's-1', CHANNEL_A, 'Akira'))

    expect(roster.join(seat('u-1', 's-1', CHANNEL_A, 'Akira'))).toEqual({ left: null, joined: null })
  })

  it('trocar de canal sai do anterior e vai para o fim', () => {
    const roster = new VoiceRoster()
    roster.join(seat('u-1', 's-1', CHANNEL_A, 'Akira'))
    roster.join(seat('u-2', 's-2', CHANNEL_B, 'Bia'))

    const move = roster.join(seat('u-1', 's-1', CHANNEL_B, 'Akira'))

    expect(move.left).toEqual({ channelId: CHANNEL_A, userId: 'u-1' })
    expect(move.joined).toEqual({ channelId: CHANNEL_B, userId: 'u-1', displayName: 'Akira' })
    expect(roster.snapshot().map((occupant) => occupant.userId)).toEqual(['u-2', 'u-1'])
  })

  it('outra janela assume o assento e a queda da antiga não esvazia a call', () => {
    const roster = new VoiceRoster()
    roster.join(seat('u-1', 'janela-1', CHANNEL_A, 'Akira'))
    roster.join(seat('u-2', 's-2', CHANNEL_A, 'Bia'))

    const takeover = roster.join(seat('u-1', 'janela-2', CHANNEL_A, 'Akira'))

    expect(takeover, 'já estava neste canal').toEqual({ left: null, joined: null })
    expect(roster.leave('u-1', 'janela-1'), 'socket antigo').toBeNull()
    expect(roster.snapshot().map((occupant) => occupant.userId)).toEqual(['u-1', 'u-2'])
    expect(roster.leave('u-1', 'janela-2')?.userId).toBe('u-1')
    expect(roster.snapshot().map((occupant) => occupant.userId)).toEqual(['u-2'])
  })

  it('sair de quem não estava na call não muda o snapshot', () => {
    const roster = new VoiceRoster()

    expect(roster.leave('fantasma', 's-1')).toBeNull()
    expect(roster.snapshot()).toEqual([])
  })

  it('nome novo no mesmo canal só anuncia a entrada atualizada', () => {
    const roster = new VoiceRoster()
    roster.join(seat('u-1', 's-1', CHANNEL_A, 'akira'))

    const move = roster.join(seat('u-1', 's-1', CHANNEL_A, 'Akira'))

    expect(move.left).toBeNull()
    expect(move.joined?.displayName).toBe('Akira')
  })

  it('recusa assento com campo vazio', () => {
    const roster = new VoiceRoster()

    expect(() => roster.join(seat('', 's-1', CHANNEL_A, 'Akira'))).toThrow(/userId/)
  })

  it('acompanha 50 pessoas e a saída da metade', () => {
    const roster = new VoiceRoster()
    for (let index = 0; index < 50; index += 1) {
      const channelId = index % 2 === 0 ? CHANNEL_A : CHANNEL_B
      roster.join(seat(`u-${index}`, `s-${index}`, channelId, `Nome ${index}`))
    }

    for (let index = 0; index < 25; index += 1) roster.leave(`u-${index}`, `s-${index}`)

    const remaining = roster.snapshot()
    expect(remaining, 'metade continua na call').toHaveLength(25)
    expect(remaining.every((occupant) => Number(occupant.userId.slice(2)) >= 25)).toBe(true)
  })
})
