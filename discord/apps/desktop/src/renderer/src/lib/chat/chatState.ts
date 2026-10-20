import type {
  ChannelDto,
  MemberDto,
  MessageDeletedPayload,
  MessageDto,
  MessagePageDto,
  PresenceChangedPayload,
} from '@radcord/shared'

export interface ChatState {
  channels: ChannelDto[]
  members: Record<string, MemberDto>
  /** `undefined` = histórico do canal ainda não carregado. */
  messagesByChannel: Record<string, MessageDto[] | undefined>
  hasMoreByChannel: Record<string, boolean>
}

export const EMPTY_CHAT_STATE: ChatState = { channels: [], members: {}, messagesByChannel: {}, hasMoreByChannel: {} }

const KIND_ORDER: Record<ChannelDto['kind'], number> = { text: 0, voice: 1 }

function sortChannels(channels: ChannelDto[]): ChannelDto[] {
  return [...channels].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.position - b.position)
}

/** Troca a lista de canais e descarta mensagens em cache (usado na conexão e reconexão). */
export function withInitialData(state: ChatState, channels: ChannelDto[], members: MemberDto[]): ChatState {
  const byId = Object.fromEntries(members.map((member) => [member.id, member]))
  return { ...state, channels: sortChannels(channels), members: byId, messagesByChannel: {}, hasMoreByChannel: {} }
}

export function withChannelAdded(state: ChatState, channel: ChannelDto): ChatState {
  const others = state.channels.filter((existing) => existing.id !== channel.id)
  return { ...state, channels: sortChannels([...others, channel]) }
}

export function withMemberUpserted(state: ChatState, member: MemberDto): ChatState {
  return { ...state, members: { ...state.members, [member.id]: member } }
}

/** Atualiza nome e foto sem apagar o status online que o cliente já conhece. */
export function withMemberProfile(state: ChatState, member: MemberDto): ChatState {
  const online = state.members[member.id]?.online ?? member.online
  return withMemberUpserted(state, { ...member, online })
}

export function withPresence(state: ChatState, { userId, online }: PresenceChangedPayload): ChatState {
  const member = state.members[userId]
  if (!member) return state
  return withMemberUpserted(state, { ...member, online })
}

/** Adiciona mensagem nova ou substitui a editada; ignora canais cujo histórico não foi aberto. */
export function withMessageUpserted(state: ChatState, message: MessageDto): ChatState {
  const current = state.messagesByChannel[message.channelId]
  if (!current) return state
  const exists = current.some((existing) => existing.id === message.id)
  const next = exists ? current.map((existing) => (existing.id === message.id ? message : existing)) : [...current, message]
  return { ...state, messagesByChannel: { ...state.messagesByChannel, [message.channelId]: next } }
}

export function withMessageRemoved(state: ChatState, { id, channelId }: MessageDeletedPayload): ChatState {
  const current = state.messagesByChannel[channelId]
  if (!current) return state
  const next = current.filter((message) => message.id !== id)
  return { ...state, messagesByChannel: { ...state.messagesByChannel, [channelId]: next } }
}

/** Coloca uma página mais antiga do histórico antes das mensagens já carregadas. */
export function withHistoryPrepended(state: ChatState, channelId: string, page: MessagePageDto): ChatState {
  const current = state.messagesByChannel[channelId] ?? []
  const knownIds = new Set(current.map((message) => message.id))
  const older = page.messages.filter((message) => !knownIds.has(message.id))
  return {
    ...state,
    messagesByChannel: { ...state.messagesByChannel, [channelId]: [...older, ...current] },
    hasMoreByChannel: { ...state.hasMoreByChannel, [channelId]: page.hasMore },
  }
}
