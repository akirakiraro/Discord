import { beforeEach, describe, expect, it } from 'vitest'
import { RecordingBroadcaster, fixedClock, sequentialIds } from '../testing/fakes'
import { InMemoryChannelRepository } from '../testing/inMemoryChannelRepository'
import { ChannelService } from './channelService'

describe('ChannelService', () => {
  let service: ChannelService
  let broadcaster: RecordingBroadcaster

  beforeEach(() => {
    broadcaster = new RecordingBroadcaster()
    service = new ChannelService({
      channels: new InMemoryChannelRepository(),
      broadcaster,
      clock: fixedClock(),
      newId: sequentialIds('channel'),
    })
  })

  it('cria os canais "geral" de texto e voz só na primeira vez', () => {
    service.ensureDefaultChannels()
    service.ensureDefaultChannels()

    expect(service.list().map((channel) => `${channel.kind}:${channel.name}`)).toEqual(['text:geral', 'voice:geral'])
    expect(broadcaster.events, 'canais padrão não são anunciados').toHaveLength(0)
  })

  it('cria canal na próxima posição e avisa todo mundo', () => {
    service.ensureDefaultChannels()

    const created = service.create({ name: 'memes', kind: 'text' })

    expect(created).toEqual({ id: 'channel-3', name: 'memes', kind: 'text', position: 1 })
    expect(broadcaster.events).toEqual([{ event: 'channel:created', payload: created }])
  })

  it('recusa canal duplicado com 409', () => {
    service.create({ name: 'memes', kind: 'text' })

    expect(() => service.create({ name: 'memes', kind: 'text' })).toThrow(/Já existe.*"memes"/)
  })

  it('requireChannel valida existência e tipo', () => {
    const voice = service.create({ name: 'call', kind: 'voice' })

    expect(service.requireChannel(voice.id, 'voice').name).toBe('call')
    expect(() => service.requireChannel(voice.id, 'text')).toThrow(/esperado text/)
    expect(() => service.requireChannel('nada', 'text')).toThrow(/"nada" não existe/)
  })
})
