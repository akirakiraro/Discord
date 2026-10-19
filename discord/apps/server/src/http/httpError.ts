import type { ZodType } from 'zod'

/**
 * Erro com status HTTP; o error handler do Fastify o transforma em `{ error, message }`.
 * Exemplo: `throw new HttpError(404, 'channel_not_found', 'Canal "x" não existe')`
 */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/**
 * Valida a entrada com Zod; em caso de falha lança 400 com o valor recebido e o formato esperado.
 * Exemplo: `const body = parseRequest(messageContentSchema, request.body)`
 */
export function parseRequest<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input)
  if (parsed.success) return parsed.data
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'corpo'}: ${issue.message}`)
  throw new HttpError(400, 'invalid_request', `Recebido ${describeInput(input)}; problemas: ${issues.join('; ')}`)
}

const SENSITIVE_KEYS = new Set(['password'])

/** O corpo volta na mensagem de erro; senhas nunca podem ecoar de volta nem cair em log. */
export function describeInput(input: unknown): string {
  return JSON.stringify(input, (key, value: unknown) => (SENSITIVE_KEYS.has(key) ? '***' : value)) ?? 'undefined'
}
