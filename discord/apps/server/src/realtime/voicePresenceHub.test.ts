import { describe, expect, it } from 'vitest'
import { RecordingBroadcaster } from '../testing/fakes'
import { VoicePresenceHub } from './voicePresenceHub'
import { VoiceRoster } from './voiceRoster'

const VOICE = '6f1c2b7e-1d1a-4c55-9b8e-3a2f4d5e6f70'
const OTHER = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const TEXT = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

function movedTo(payload: unknown, channelId: string): boolean {
  if (!payload || typeof payload !== 'object' || !('channelId' in payload)) return false
  return (payload as { channelId?: unknown }).channelId === channelId
}

function setup(names: Record<string, string> = { 'u-1': 'Akira', 'u-2': 'Bia' }): {
  hub: VoicePresenceHub
  broadcast: RecordingBroadcaster
} {
  const broadcast = new RecordingBroadcaster()
  const voice = new Set([VOICE, OTHER])
  const hub = new VoicePresenceHub({
    roster: new VoiceRoster(),
    isVoiceChannel: (channelId) => voice.has(channelId),
    displayName: (userId) => names[userId],
    broadcast,
  })
  return { hub, broadcast }
}

describe('VoicePresenceHub', () => {
  it('publica a entrada e o snapshot para quem abre o app depois', () => {
    const { hub, broadcast } = setup()

    hub.join('u-1', 's-1', { channelId: VOICE })
    hub.join('u-2', 's-2', { channelId: VOICE })

    expect(broadcast.events.map((event) => event.event)).toEqual(['voice:joined', 'voice:joined'])
    expect(hub.snapshot().occupants.map((occupant) => occupant.displayName)).toEqual(['Akira', 'Bia'])
  })

  it('ignora canal de texto, id inválido e usuário sem nome', () => {
    const { hub, broadcast } = setup({ 'u-1': 'Akira' })

    hub.join('u-1', 's-1', { channelId: TEXT })
    hub.join('u-1', 's-1', { channelId: 'geral' })
    hub.join('u-1', 's-1', null)
    hub.join('desconhecido', 's-9', { channelId: VOICE })

    expect(broadcast.events, 'nada disso ocupa a call').toEqual([])
    expect(hub.snapshot().occupants).toEqual([])
  })

  it('trocar de canal avisa a saída e a entrada', () => {
    const { hub, broadcast } = setup()
    hub.join('u-1', 's-1', { channelId: VOICE })

    hub.join('u-1', 's-1', { channelId: OTHER })

    expect(broadcast.events.filter((row) => row.event === 'voice:left' || movedTo(row.payload, OTHER))).toEqual([
      { event: 'voice:left', payload: { channelId: VOICE, userId: 'u-1' } },
      { event: 'voice:joined', payload: { channelId: OTHER, userId: 'u-1', displayName: 'Akira' } },
    ])
  })

  it('a queda do socket tira a pessoa; a janela que não entrou não tira', () => {
    const { hub, broadcast } = setup()
    hub.join('u-1', 'call', { channelId: VOICE })

    hub.leave('u-1', 'chat')
    expect(broadcast.events.map((event) => event.event)).toEqual(['voice:joined'])

    hub.leave('u-1', 'call')
    expect(broadcast.events.at(-1)).toEqual({
      event: 'voice:left',
      payload: { channelId: VOICE, userId: 'u-1' },
    })
    expect(hub.snapshot().occupants).toEqual([])
  })

  it('sair duas vezes não repete o evento', () => {
    const { hub, broadcast } = setup()
    hub.join('u-1', 's-1', { channelId: VOICE })

    hub.leave('u-1', 's-1')
    hub.leave('u-1', 's-1')

    expect(broadcast.events.filter((event) => event.event === 'voice:left')).toHaveLength(1)
  })

  it('cinquenta entradas aparecem no snapshot e a metade sai', () => {
    const names = Object.fromEntries(Array.from({ length: 50 }, (_unused, index) => [`u-${index}`, `Nome ${index}`]))
    const { hub } = setup(names)

    for (let index = 0; index < 50; index += 1) {
      hub.join(`u-${index}`, `s-${index}`, { channelId: index % 2 === 0 ? VOICE : OTHER })
    }
    for (let index = 0; index < 25; index += 1) hub.leave(`u-${index}`, `s-${index}`)

    expect(hub.snapshot().occupants, 'quem caiu ou saiu não fica na lista').toHaveLength(25)
  })
})
