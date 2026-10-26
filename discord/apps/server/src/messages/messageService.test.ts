import { beforeEach, describe, expect, it } from 'vitest'
import { ChannelService } from '../channels/channelService'
import { RecordingBroadcaster, fixedClock, sequentialIds } from '../testing/fakes'
import { InMemoryChannelRepository } from '../testing/inMemoryChannelRepository'
import { InMemoryMessageRepository } from '../testing/inMemoryMessageRepository'
import { MessageService } from './messageService'

const BULK_MESSAGE_COUNT = 60

describe('MessageService', () => {
  let service: MessageService
  let broadcaster: RecordingBroadcaster
  let textChannelId: string
  let voiceChannelId: string

  beforeEach(() => {
    broadcaster = new RecordingBroadcaster()
    const channels = new ChannelService({
      channels: new InMemoryChannelRepository(),
      broadcaster: new RecordingBroadcaster(),
      clock: fixedClock(),
      newId: sequentialIds('channel'),
    })
    textChannelId = channels.create({ name: 'geral', kind: 'text' }).id
    voiceChannelId = channels.create({ name: 'geral', kind: 'voice' }).id
    service = new MessageService({
      messages: new InMemoryMessageRepository(),
      channels,
      broadcaster,
      clock: fixedClock(),
      newId: sequentialIds('msg'),
    })
  })

  it('envia mensagem e transmite para todos', () => {
    const message = service.send('u-1', textChannelId, 'bora jogar?', null)

    expect(message).toMatchObject({ id: 'msg-1', authorId: 'u-1', content: 'bora jogar?', editedAt: null })
    expect(broadcaster.events).toEqual([{ event: 'message:created', payload: message }])
  })

  it('recusa mensagem em canal de voz', () => {
    expect(() => service.send('u-1', voiceChannelId, 'oi', null)).toThrow(/esperado text/)
  })

  it('pagina o histórico com 60 mensagens e informa se há mais', () => {
    for (let index = 0; index < BULK_MESSAGE_COUNT; index++) service.send('u-1', textChannelId, `m${index}`, null)

    const latest = service.history(textChannelId, { limit: 50 })
    const older = service.history(textChannelId, { limit: 50, before: latest.messages[0]?.id })

    expect(latest.messages).toHaveLength(50)
    expect(latest.messages[0]?.id).toBe('msg-11')
    expect(latest.messages.at(-1)?.id).toBe('msg-60')
    expect(latest.hasMore, 'ainda restam 10').toBe(true)
    expect(older.messages.map((message) => message.id)).toEqual(['msg-1', 'msg-2', 'msg-3', 'msg-4', 'msg-5', 'msg-6', 'msg-7', 'msg-8', 'msg-9', 'msg-10'])
    expect(older.hasMore, 'chegou no começo').toBe(false)

    const exact = service.history(textChannelId, { limit: 60 })
    expect(exact.hasMore, 'a página cheia não finge que há mais').toBe(false)
    expect(exact.messages[0]?.id).toBe('msg-1')
    expect(exact.messages).toHaveLength(60)
  })

  it('autor edita e apaga a própria mensagem, avisando os outros', () => {
    const message = service.send('u-1', textChannelId, 'oi', null)

    const edited = service.edit('u-1', message.id, 'olá')

    expect(edited).toMatchObject({ content: 'olá', editedAt: '2026-10-19T12:00:00.000Z' })
    expect(service.history(textChannelId, { limit: 10 }).messages[0]?.content).toBe('olá')
    service.remove('u-1', message.id)
    expect(broadcaster.events.map((recorded) => recorded.event)).toEqual(['message:created', 'message:updated', 'message:deleted'])
    expect(broadcaster.events.at(-1)).toEqual({
      event: 'message:deleted',
      payload: { id: message.id, channelId: textChannelId },
    })
    expect(service.history(textChannelId, { limit: 50 }).messages).toHaveLength(0)
  })

  it('impede outro usuário de editar ou apagar', () => {
    const message = service.send('u-1', textChannelId, 'oi', null)

    expect(() => service.edit('u-2', message.id, 'hack')).toThrow(/só o autor/)
    expect(() => service.remove('u-2', message.id)).toThrow(/só o autor/)
  })

  it('guarda o print junto da mensagem', () => {
    const imageUrl = 'data:image/jpeg;base64,YQ=='
    const message = service.send('u-1', textChannelId, '', imageUrl)

    expect(message.imageUrl).toBe(imageUrl)
    expect(service.history(textChannelId, { limit: 50 }).messages[0]?.imageUrl).toBe(imageUrl)
  })

  it('responde 404 para mensagem inexistente', () => {
    expect(() => service.edit('u-1', 'nada', 'x')).toThrow(/"nada" não existe/)
  })

  it('não apaga o texto se a edição vier vazia e não houver print', () => {
    const text = service.send('u-1', textChannelId, 'oi', null)
    const image = 'data:image/jpeg;base64,YQ=='
    const print = service.send('u-1', textChannelId, '', image)

    expect(() => service.edit('u-1', text.id, '')).toThrow(/vazia/)
    expect(service.edit('u-1', print.id, '').content).toBe('')
    expect(service.edit('u-1', print.id, '').imageUrl).toBe(image)
  })
})
