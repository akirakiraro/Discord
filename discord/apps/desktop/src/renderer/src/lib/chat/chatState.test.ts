import { describe, expect, it } from 'vitest'
import type { ChannelDto, MemberDto, MessageDto } from '@radcord/shared'
import {
  EMPTY_CHAT_STATE,
  withChannelAdded,
  withHistoryPrepended,
  withInitialData,
  withMemberProfile,
  withMemberUpserted,
  withMessageRemoved,
  withMessageUpserted,
  withPresence,
  type ChatState,
} from './chatState'

const TEXT: ChannelDto = { id: 't', name: 'geral', kind: 'text', position: 0 }
const VOICE: ChannelDto = { id: 'v', name: 'geral', kind: 'voice', position: 0 }
const AKIRA: MemberDto = { id: 'u-1', username: 'akira', displayName: 'Akira', createdAt: 'x', online: false }

function message(id: string, overrides: Partial<MessageDto> = {}): MessageDto {
  return { id, channelId: 't', authorId: 'u-1', content: id, createdAt: 'x', editedAt: null, ...overrides }
}

function openedChannel(messages: MessageDto[] = []): ChatState {
  return withHistoryPrepended(withInitialData(EMPTY_CHAT_STATE, [TEXT], [AKIRA]), 't', { messages, hasMore: false })
}

describe('chatState', () => {
  it('withInitialData ordena texto antes de voz e zera o cache de mensagens', () => {
    const dirty: ChatState = { ...EMPTY_CHAT_STATE, messagesByChannel: { t: [message('velha')] } }

    const state = withInitialData(dirty, [VOICE, TEXT], [AKIRA])

    expect(state.channels.map((channel) => channel.id)).toEqual(['t', 'v'])
    expect(state.members['u-1']).toEqual(AKIRA)
    expect(state.messagesByChannel).toEqual({})
  })

  it('withChannelAdded não duplica e mantém a ordem por posição', () => {
    const memes: ChannelDto = { id: 'm', name: 'memes', kind: 'text', position: 1 }
    const state = withChannelAdded(withChannelAdded(withInitialData(EMPTY_CHAT_STATE, [VOICE, TEXT], []), memes), memes)

    expect(state.channels.map((channel) => channel.id)).toEqual(['t', 'm', 'v'])
  })

  it('withPresence atualiza membro conhecido e ignora desconhecido', () => {
    const state = withInitialData(EMPTY_CHAT_STATE, [], [AKIRA])

    expect(withPresence(state, { userId: 'u-1', online: true }).members['u-1']?.online).toBe(true)
    expect(withPresence(state, { userId: 'fantasma', online: true })).toBe(state)
  })

  it('withMemberProfile troca nome e foto e mantém o online', () => {
    const state = withPresence(withInitialData(EMPTY_CHAT_STATE, [], [AKIRA]), { userId: 'u-1', online: true })

    const next = withMemberProfile(state, { ...AKIRA, displayName: 'Novo', online: false })

    expect(next.members['u-1']?.displayName).toBe('Novo')
    expect(next.members['u-1']?.online).toBe(true)
  })

  it('withMemberUpserted adiciona quem acabou de se cadastrar', () => {
    const bia: MemberDto = { ...AKIRA, id: 'u-2', username: 'bia', displayName: 'Bia' }

    expect(Object.keys(withMemberUpserted(EMPTY_CHAT_STATE, bia).members)).toEqual(['u-2'])
  })

  it('withMessageUpserted acrescenta nova, substitui editada e ignora canal não aberto', () => {
    const state = openedChannel([message('a')])

    const withNew = withMessageUpserted(state, message('b'))
    const withEdit = withMessageUpserted(withNew, message('a', { content: 'editada' }))

    expect(withEdit.messagesByChannel.t?.map((m) => m.content)).toEqual(['editada', 'b'])
    expect(withMessageUpserted(state, message('x', { channelId: 'outro' }))).toBe(state)
  })

  it('withMessageRemoved tira a mensagem do canal', () => {
    const state = withMessageRemoved(openedChannel([message('a'), message('b')]), { id: 'a', channelId: 't' })

    expect(state.messagesByChannel.t?.map((m) => m.id)).toEqual(['b'])
  })

  it('withHistoryPrepended põe a página antiga antes, sem duplicar, e guarda hasMore', () => {
    const recentPage = Array.from({ length: 50 }, (_unused, index) => message(`r${index}`))
    const state = openedChannel(recentPage)

    const next = withHistoryPrepended(state, 't', { messages: [message('old'), message('r0')], hasMore: true })

    expect(next.messagesByChannel.t).toHaveLength(51)
    expect(next.messagesByChannel.t?.[0]?.id).toBe('old')
    expect(next.hasMoreByChannel.t).toBe(true)
  })
})
