import { loginRequestSchema, registerRequestSchema, type AuthResponse } from '@radcord/shared'
import type { ZodType } from 'zod'
import type { AuthSession } from '../../stores/sessionStore'
import { ApiRequestError, RadcordApiClient, type FetchFunction } from '../api/apiClient'
import { buildHostBaseUrl } from '../hostAddress'

export type AuthMode = 'login' | 'register'

export interface AuthForm {
  hostAddress: string
  username: string
  displayName: string
  password: string
}

const FIELD_LABELS: Record<string, string> = { username: 'Usuário', displayName: 'Nome de exibição', password: 'Senha' }

function validateLocally<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input)
  if (parsed.success) return parsed.data
  const [issue] = parsed.error.issues
  const field = String(issue?.path[0] ?? '')
  throw new Error(`${FIELD_LABELS[field] ?? field}: ${issue?.message ?? 'valor inválido'}`)
}

/**
 * Valida o formulário no próprio app e faz login ou cadastro no host.
 * Exemplo: `const session = await authenticate(form, 'login')`
 */
export async function authenticate(form: AuthForm, mode: AuthMode, fetchFn?: FetchFunction): Promise<AuthSession> {
  const api = new RadcordApiClient(buildHostBaseUrl(form.hostAddress), null, fetchFn)
  const response = await sendCredentials(api, form, mode)
  return { api: api.withToken(response.token), token: response.token, user: response.user }
}

function sendCredentials(api: RadcordApiClient, form: AuthForm, mode: AuthMode): Promise<AuthResponse> {
  if (mode === 'register') return api.register(validateLocally(registerRequestSchema, form))
  return api.login(validateLocally(loginRequestSchema, form))
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
