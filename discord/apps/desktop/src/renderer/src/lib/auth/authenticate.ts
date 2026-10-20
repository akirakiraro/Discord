import { joinRequestSchema } from '@radcord/shared'
import type { ZodType } from 'zod'
import type { AuthSession } from '../../stores/sessionStore'
import { ApiRequestError, RadcordApiClient, type FetchFunction } from '../api/apiClient'
import { buildHostBaseUrl } from '../hostAddress'

const FIELD_LABELS: Record<string, string> = { username: 'Usuário' }

function validateLocally<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input)
  if (parsed.success) return parsed.data
  const [issue] = parsed.error.issues
  const field = String(issue?.path[0] ?? '')
  throw new Error(`${FIELD_LABELS[field] ?? field}: ${issue?.message ?? 'valor inválido'}`)
}

/**
 * Valida o nome no próprio app e entra no host (cria a conta se ela não existe).
 * Exemplo: `const session = await authenticate('26.186.21.58', 'akira')`
 */
export async function authenticate(hostAddress: string, username: string, fetchFn?: FetchFunction): Promise<AuthSession> {
  const api = new RadcordApiClient(buildHostBaseUrl(hostAddress), null, fetchFn)
  const response = await api.join(validateLocally(joinRequestSchema, { username }))
  return { api: api.withToken(response.token), token: response.token, user: response.user }
}

/**
 * Reabre a sessão salva; devolve `null` se o token não vale mais.
 * Exemplo: `const session = await restoreSession('26.186.21.58', token)`
 */
export async function restoreSession(hostAddress: string, token: string, fetchFn?: FetchFunction): Promise<AuthSession | null> {
  const api = new RadcordApiClient(buildHostBaseUrl(hostAddress), token, fetchFn)
  try {
    return { api, token, user: await api.me() }
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) return null
    throw error
  }
}
