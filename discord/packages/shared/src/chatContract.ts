import { z } from 'zod'

export const CHANNEL_KINDS = ['text', 'voice'] as const
export type ChannelKind = (typeof CHANNEL_KINDS)[number]

export const MESSAGE_MAX_LENGTH = 2000
export const MESSAGE_PAGE_SIZE = 50

export const createChannelRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{1,32}$/, 'use de 1 a 32 caracteres: letras, números ou hífen'),
  kind: z.enum(CHANNEL_KINDS),
})

export const messageContentSchema = z.object({
  content: z.string().trim().min(1, 'a mensagem está vazia').max(MESSAGE_MAX_LENGTH),
})

export const messageHistoryQuerySchema = z.object({
  before: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(MESSAGE_PAGE_SIZE),
})

export type CreateChannelRequest = z.infer<typeof createChannelRequestSchema>
export type MessageContentRequest = z.infer<typeof messageContentSchema>
export type MessageHistoryQuery = z.infer<typeof messageHistoryQuerySchema>

export interface ChannelDto {
  id: string
  name: string
  kind: ChannelKind
  position: number
}

export interface MessageDto {
  id: string
  channelId: string
  authorId: string
  content: string
  createdAt: string
  editedAt: string | null
}

export interface MessagePageDto {
  messages: MessageDto[]
  hasMore: boolean
}
