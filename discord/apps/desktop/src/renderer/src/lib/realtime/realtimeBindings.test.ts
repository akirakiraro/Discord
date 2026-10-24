import { describe, expect, it } from 'vitest'
import type { ChannelDto, MemberDto, MessageDto, ServerToClientEvents } from '@radcord/shared'
import { EMPTY_CHAT_STATE, withHistoryPrepended, withInitialData, type ChatState } from '../chat/chatState'
import { activeTypistIds, type TypingState } from '../chat/typingState'
import { EMPTY_VOICE_ROSTER, type VoiceRosterState } from '../voice/voiceRosterState'
import { bindRealtimeEvents, type RealtimeEventSource } from './realtimeBindings'

type ServerEventName = keyof ServerToClientEvents

class FakeRealtimeSource implements RealtimeEventSource {
  private readonly listeners = new Map<ServerEventName, (payload: never) => void>()

  on<E extends ServerEventName>(event: E, listener: ServerToClientEvents[E]): void {
    this.listeners.set(event, listener as (payload: never) => void)
  }

  deliver<E extends ServerEventName>(event: E, payload: Parameters<ServerToClientEvents[E]>[0]): void {
    this.listeners.get(event)?.(payload as never)
  }
}

class StateHarness {
  chat: ChatState
  typing: TypingState = {}
  roster: VoiceRosterState = EMPTY_VOICE_ROSTER

  constructor(initial: ChatState) {
    this.chat = initial
  }

  readonly sinks = {
    applyChat: (update: (state: ChatState) => ChatState) => (this.chat = update(this.chat)),
    applyTyping: (update: (state: TypingState) => TypingState) => (this.typing = update(this.typing)),
    applyRoster: (update: (state: VoiceRosterState) => VoiceRosterState) => (this.roster = update(this.roster)),
    nowMs: () => 1000,
  }
}

const TEXT: ChannelDto = { id: 't', name: 'geral', kind: 'text', position: 0 }
const AKIRA: MemberDto = { id: 'u-1', username: 'akira', displayName: 'Akira', createdAt: 'x', online: false }
const MESSAGE: MessageDto = { id: 'm', channelId: 't', authorId: 'u-1', content: 'oi', createdAt: 'x', editedAt: null }

function setup(): { source: FakeRealtimeSource; harness: StateHarness } {
  const opened = withHistoryPrepended(withInitialData(EMPTY_CHAT_STATE, [TEXT], [AKIRA]), 't', { messages: [], hasMore: false })
  const source = new FakeRealtimeSource()
  const harness = new StateHarness(opened)
  bindRealtimeEvents(source, harness.sinks)
  return { source, harness }
}

describe('bindRealtimeEvents', () => {
  it('mensagem nova entra no canal e encerra o "digitando…" do autor', () => {
    const { source, harness } = setup()
    source.deliver('typing:started', { channelId: 't', userId: 'u-1' })

    source.deliver('message:created', MESSAGE)

    expect(harness.chat.messagesByChannel.t).toEqual([MESSAGE])
    expect(activeTypistIds(harness.typing, 't', 1000)).toEqual([])
  })

  it('edição e remoção refletem no canal', () => {
    const { source, harness } = setup()
    source.deliver('message:created', MESSAGE)

    source.deliver('message:updated', { ...MESSAGE, content: 'editada' })
    expect(harness.chat.messagesByChannel.t?.[0]?.content).toBe('editada')

    source.deliver('message:deleted', { id: 'm', channelId: 't' })
    expect(harness.chat.messagesByChannel.t).toEqual([])
  })

  it('canal novo, membro novo e presença atualizam as listas', () => {
    const { source, harness } = setup()

    source.deliver('channel:created', { id: 'n', name: 'memes', kind: 'text', position: 1 })
    source.deliver('member:joined', { ...AKIRA, id: 'u-2', displayName: 'Bia' })
    source.deliver('presence:changed', { userId: 'u-1', online: true })

    expect(harness.chat.channels.map((channel) => channel.name)).toEqual(['geral', 'memes'])
    expect(harness.chat.members['u-2']?.displayName).toBe('Bia')
    expect(harness.chat.members['u-1']?.online).toBe(true)
  })

  it('snapshot, entrada e saída de voz atualizam quem está no canal', () => {
    const { source, harness } = setup()
    const akira = { channelId: 'v', userId: 'u-1', displayName: 'Akira' }

    source.deliver('voice:snapshot', { occupants: [akira] })
    source.deliver('voice:joined', { channelId: 'v', userId: 'u-2', displayName: 'Bia' })
    source.deliver('voice:left', { channelId: 'v', userId: 'u-1' })

    expect(harness.roster.occupants).toEqual([{ channelId: 'v', userId: 'u-2', displayName: 'Bia' }])
  })

  it('repassa a versão publicada pelo host', () => {
    const versions: string[] = []
    const source = new FakeRealtimeSource()
    const harness = new StateHarness(EMPTY_CHAT_STATE)
    bindRealtimeEvents(source, { ...harness.sinks, onAppRelease: (version) => versions.push(version) })

    source.deliver('app:release', { version: '0.1.117' })

    expect(versions).toEqual(['0.1.117'])
  })
})
