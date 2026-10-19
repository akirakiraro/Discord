import type { MessageDto } from '@radcord/shared'
import type { MessageRepository } from '../messages/messageRepository'

/** Guarda em ordem de inserção, que nos testes já é a ordem cronológica. */
export class InMemoryMessageRepository implements MessageRepository {
  readonly messages: MessageDto[] = []

  insert(message: MessageDto): void {
    this.messages.push(message)
  }

  findById(id: string): MessageDto | undefined {
    return this.messages.find((message) => message.id === id)
  }

  updateContent(id: string, content: string, editedAt: string): void {
    const message = this.findById(id)
    if (message) Object.assign(message, { content, editedAt })
  }

  delete(id: string): void {
    const index = this.messages.findIndex((message) => message.id === id)
    if (index >= 0) this.messages.splice(index, 1)
  }

  listBefore(channelId: string, beforeId: string | undefined, limit: number): MessageDto[] {
    const inChannel = this.messages.filter((message) => message.channelId === channelId)
    const cursorIndex = beforeId ? inChannel.findIndex((message) => message.id === beforeId) : inChannel.length
    return inChannel.slice(Math.max(0, cursorIndex - limit), cursorIndex)
  }
}
