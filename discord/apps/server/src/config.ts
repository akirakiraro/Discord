import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SERVER_DEFAULT_PORT } from '@radcord/shared'
import { DEFAULT_RELEASE_POLL_MS } from './updates/releasePoller'

type ServerEnvKey =
  | 'PORT'
  | 'BIND_HOST'
  | 'DATABASE_PATH'
  | 'LIVEKIT_API_KEY'
  | 'LIVEKIT_API_SECRET'
  | 'LIVEKIT_PUBLIC_URL'
  | 'UPDATES_DIR'
  | 'RELEASE_POLL_MS'

export type ServerEnv = Readonly<Partial<Record<ServerEnvKey, string>>>

export interface ServerConfig {
  port: number
  bindHost: string
  databasePath: string
  livekitApiKey: string
  livekitApiSecret: string
  livekitPublicUrl: string
  updatesDir: string
  releasePollMs: number
}

const DEFAULT_DATABASE_PATH = 'data/radcord.db'

// tsx roda este arquivo em apps/server/src; a pasta publicada fica ao lado dos scripts do host.
const DEFAULT_UPDATES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../infra/host/updates')

// LiveKit rejeita segredos menores que 32 caracteres ao assinar tokens.
const MIN_SECRET_LENGTH = 32

/**
 * Lê e valida a configuração do servidor a partir das variáveis de ambiente.
 * Exemplo: `loadServerConfig(process.env)`
 */
export function loadServerConfig(env: ServerEnv): ServerConfig {
  return {
    port: parsePort(env.PORT),
    bindHost: env.BIND_HOST?.trim() || '0.0.0.0',
    databasePath: env.DATABASE_PATH?.trim() || DEFAULT_DATABASE_PATH,
    livekitApiKey: requireEnv(env, 'LIVEKIT_API_KEY'),
    livekitApiSecret: requireSecret(env),
    livekitPublicUrl: requireWebSocketUrl(env),
    updatesDir: env.UPDATES_DIR?.trim() || DEFAULT_UPDATES_DIR,
    releasePollMs: parseReleasePoll(env.RELEASE_POLL_MS),
  }
}

function requireEnv(env: ServerEnv, key: ServerEnvKey): string {
  const value = env[key]?.trim()
  if (!value) {
    throw new Error(`Variável ${key} ausente: recebido ${JSON.stringify(env[key])}, esperado texto não vazio`)
  }
  return value
}

function parseReleasePoll(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_RELEASE_POLL_MS
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 10_000 || value > 3_600_000) {
    throw new Error(`RELEASE_POLL_MS inválido: recebido ${JSON.stringify(raw)}, esperado inteiro entre 10000 e 3600000`)
  }
  return value
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return SERVER_DEFAULT_PORT
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT inválida: recebido ${JSON.stringify(raw)}, esperado inteiro entre 1 e 65535`)
  }
  return port
}

function requireSecret(env: ServerEnv): string {
  const secret = requireEnv(env, 'LIVEKIT_API_SECRET')
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `LIVEKIT_API_SECRET tem ${secret.length} caracteres, esperado pelo menos ${MIN_SECRET_LENGTH}`,
    )
  }
  return secret
}

function requireWebSocketUrl(env: ServerEnv): string {
  const url = requireEnv(env, 'LIVEKIT_PUBLIC_URL')
  if (!/^wss?:\/\/.+/.test(url)) {
    throw new Error(`LIVEKIT_PUBLIC_URL inválida: recebido ${JSON.stringify(url)}, esperado ws://IP:PORTA`)
  }
  return url
}
