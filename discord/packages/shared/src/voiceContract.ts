import { z } from 'zod'

export const SERVER_DEFAULT_PORT = 3000

export const voiceTokenRequestSchema = z.object({
  channelId: z.uuid(),
})

export type VoiceTokenRequest = z.infer<typeof voiceTokenRequestSchema>

export interface VoiceTokenResponse {
  token: string
  livekitUrl: string
}

export interface HostHealthResponse {
  status: 'ok'
  livekitUrl: string
}
