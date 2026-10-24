import { z } from 'zod'

export const SERVER_DEFAULT_PORT = 3000

export const voiceTokenRequestSchema = z.object({
  channelId: z.uuid(),
  monitor: z.boolean().optional(),
})

/** Identidade da escuta: outra conexão na mesma sala, invisível para os outros. */
export const MONITOR_SUFFIX = ':monitor'

/**
 * Exemplo: `monitorIdentity('user-1')` devolve `'user-1:monitor'`.
 */
export function monitorIdentity(userId: string): string {
  if (userId === '') throw new Error('userId "" inválido ao montar a escuta; esperado o id do usuário')
  return `${userId}${MONITOR_SUFFIX}`
}

/** A escuta não aparece na lista de quem está no canal. */
export function isMonitorIdentity(identity: string): boolean {
  return identity.endsWith(MONITOR_SUFFIX)
}

export type VoiceTokenRequest = z.infer<typeof voiceTokenRequestSchema>

export interface VoiceTokenResponse {
  token: string
  livekitUrl: string
}

export interface HostHealthResponse {
  status: 'ok'
  livekitUrl: string
}

/** Pedido do desktop depois que a sala do LiveKit conectou. */
export const voiceJoinPayloadSchema = z.object({
  channelId: z.uuid(),
})

export type VoiceJoinPayload = z.infer<typeof voiceJoinPayloadSchema>

/** Quem aparece debaixo de um canal de voz para todo mundo logado. */
export interface VoiceOccupantDto {
  channelId: string
  userId: string
  displayName: string
}

export interface VoiceLeftPayload {
  channelId: string
  userId: string
}

export interface VoiceSnapshotPayload {
  occupants: VoiceOccupantDto[]
}
