import type { ChannelDto, ChannelKind, CreateChannelRequest } from '@radcord/shared'
import { HttpError } from '../http/httpError'
import type { Clock, IdGenerator } from '../platform/runtime'
import type { RealtimeBroadcaster } from '../realtime/realtimeBroadcaster'
import { toChannelDto, type ChannelRecord, type ChannelRepository } from './channelRepository'

export interface ChannelServiceDependencies {
  channels: ChannelRepository
  broadcaster: RealtimeBroadcaster
  clock: Clock
  newId: IdGenerator
}

const DEFAULT_CHANNELS: readonly CreateChannelRequest[] = [
  { name: 'geral', kind: 'text' },
  { name: 'geral', kind: 'voice' },
]

/**
 * Canais de texto e voz da comunidade.
 * Exemplo: `channelService.create({ name: 'memes', kind: 'text' })`
 */
export class ChannelService {
  constructor(private readonly deps: ChannelServiceDependencies) {}

  list(): ChannelDto[] {
    return this.deps.channels.listAll().map(toChannelDto)
  }

  create(request: CreateChannelRequest): ChannelDto {
    if (this.deps.channels.findByName(request.name, request.kind)) {
      throw new HttpError(409, 'channel_exists', `Já existe um canal de ${request.kind} chamado "${request.name}"`)
    }
    const channel = this.insertChannel(request)
    this.deps.broadcaster.emit('channel:created', channel)
    return channel
  }

  /** Cria os canais "geral" na primeira vez que o host sobe. */
  ensureDefaultChannels(): void {
    if (this.deps.channels.listAll().length > 0) return
    DEFAULT_CHANNELS.forEach((request) => this.insertChannel(request))
  }

  /** True só quando o id é de um canal de voz que existe. */
  isVoiceChannel(channelId: string): boolean {
    return this.deps.channels.findById(channelId)?.kind === 'voice'
  }

  requireChannel(channelId: string, kind: ChannelKind): ChannelRecord {
    const channel = this.deps.channels.findById(channelId)
    if (!channel) {
      throw new HttpError(404, 'channel_not_found', `Canal "${channelId}" não existe`)
    }
    if (channel.kind !== kind) {
      throw new HttpError(400, 'wrong_channel_kind', `Canal "${channel.name}" é de ${channel.kind}; esperado ${kind}`)
    }
    return channel
  }

  private insertChannel(request: CreateChannelRequest): ChannelDto {
    const channel: ChannelRecord = {
      id: this.deps.newId(),
      name: request.name,
      kind: request.kind,
      position: this.deps.channels.nextPosition(request.kind),
      createdAt: this.deps.clock().toISOString(),
    }
    this.deps.channels.insert(channel)
    return toChannelDto(channel)
  }
}
