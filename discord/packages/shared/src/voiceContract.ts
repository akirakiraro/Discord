import { z } from 'zod'

export const SERVER_DEFAULT_PORT = 3000

export const voiceTokenRequestSchema = z.object({
  displayName: z.string().trim().min(1).max(32),
  roomName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,32}$/, 'use apenas letras minúsculas, números e hífen'),
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
