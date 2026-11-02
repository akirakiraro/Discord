import { z } from 'zod'

/**
 * Bot de teste da call. A rota só existe no host ligado com `RADCORD_DEV_TOOLS=1`.
 * A identidade não tem `:`: o som de entrar e sair trata o bot como uma pessoa.
 */
export const DEV_BOT_IDENTITY_PREFIX = 'dev-bot-'

export const devBotTokenRequestSchema = z.object({
  channelId: z.uuid(),
  botNumber: z.number().int().min(1).max(99),
})

export type DevBotTokenRequest = z.infer<typeof devBotTokenRequestSchema>

export interface DevBotTokenResponse {
  token: string
  livekitUrl: string
  identity: string
  displayName: string
}

/**
 * Exemplo: `devBotIdentity(2)` devolve `'dev-bot-2'`.
 */
export function devBotIdentity(botNumber: number): string {
  if (!Number.isInteger(botNumber) || botNumber < 1) {
    throw new Error(`botNumber ${botNumber} inválido; esperado inteiro a partir de 1`)
  }
  return `${DEV_BOT_IDENTITY_PREFIX}${botNumber}`
}

/** Exemplo: `devBotName(2)` devolve `'Bot de teste 2'`. */
export function devBotName(botNumber: number): string {
  return `Bot de teste ${botNumber}`
}
