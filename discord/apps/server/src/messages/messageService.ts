import type { MessageDto, MessageHistoryQuery, MessagePageDto } from '@radcord/shared'
import type { ChannelService } from '../channels/channelService'
import { HttpError } from '../http/httpError'
import type { Clock, IdGenerator } from '../platform/runtime'
import type { RealtimeBroadcaster } from '../realtime/realtimeBroadcaster'
import type { MessageRepository } from './messageRepository'

export interface MessageServiceDependencies {
  messages: MessageRepository
  channels: ChannelService
  broadcaster: RealtimeBroadcaster
  clock: Clock
  newId: IdGenerator
}

/**
 * Histórico, envio, edição e remoção de mensagens em canais de texto.
 * Exemplo: `messageService.send(user.id, channelId, 'bora jogar?')`
 */
export class MessageService {
  constructor(private readonly deps: MessageServiceDependencies) {}

  history(channelId: string, query: MessageHistoryQuery): MessagePageDto {
    this.deps.channels.requireChannel(channelId, 'text')
    const rows = this.deps.messages.listBefore(channelId, query.before, query.limit + 1)
    const hasMore = rows.length > query.limit
    return { messages: hasMore ? rows.slice(1) : rows, hasMore }
  }

  send(authorId: string, channelId: string, content: string): MessageDto {
    this.deps.channels.requireChannel(channelId, 'text')
    const message: MessageDto = {
      id: this.deps.newId(),
      channelId,
      authorId,
      content,
      createdAt: this.deps.clock().toISOString(),
      editedAt: null,
    }
    this.deps.messages.insert(message)
    this.deps.broadcaster.emit('message:created', message)
    return message
  }

  edit(authorId: string, messageId: string, content: string): MessageDto {
    const original = this.requireOwnMessage(authorId, messageId)
    const editedAt = this.deps.clock().toISOString()
    this.deps.messages.updateContent(messageId, content, editedAt)
    const updated: MessageDto = { ...original, content, editedAt }
    this.deps.broadcaster.emit('message:updated', updated)
    return updated
  }

  remove(authorId: string, messageId: string): void {
    const message = this.requireOwnMessage(authorId, messageId)
    this.deps.messages.delete(messageId)
    this.deps.broadcaster.emit('message:deleted', { id: messageId, channelId: message.channelId })
  }

  private requireOwnMessage(authorId: string, messageId: string): MessageDto {
    const message = this.deps.messages.findById(messageId)
    if (!message) {
      throw new HttpError(404, 'message_not_found', `Mensagem "${messageId}" não existe`)
    }
    if (message.authorId !== authorId) {
      throw new HttpError(403, 'not_message_author', `Mensagem "${messageId}" é de outro usuário; só o autor pode alterar`)
    }
    return message
  }
}
