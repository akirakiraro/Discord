import { createHash, randomBytes } from 'node:crypto'

const TOKEN_BYTES = 32

/**
 * Token opaco entregue ao app; no banco fica só o hash, então um vazamento do .db não loga ninguém.
 * Exemplo: `const token = generateSessionToken()`
 */
export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

/**
 * Exemplo: `sessions.findUserId(hashSessionToken(token))`
 */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
