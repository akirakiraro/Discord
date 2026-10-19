import type { ChannelKind } from '@radcord/shared'
import type { ChannelRecord, ChannelRepository } from '../channels/channelRepository'

export class InMemoryChannelRepository implements ChannelRepository {
  private readonly channels: ChannelRecord[] = []

  insert(channel: ChannelRecord): void {
    this.channels.push(channel)
  }

  findById(id: string): ChannelRecord | undefined {
    return this.channels.find((channel) => channel.id === id)
  }

  findByName(name: string, kind: ChannelKind): ChannelRecord | undefined {
    return this.channels.find((channel) => channel.name === name && channel.kind === kind)
  }

  listAll(): ChannelRecord[] {
    return [...this.channels]
  }

  nextPosition(kind: ChannelKind): number {
    return this.channels.filter((channel) => channel.kind === kind).length
  }
}
