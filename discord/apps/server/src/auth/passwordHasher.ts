import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>
const KEY_LENGTH = 64
const SALT_LENGTH = 16
const HASH_PREFIX = 'scrypt'

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, storedHash: string): Promise<boolean>
}

/**
 * Hash de senha com scrypt nativo do Node (sem dependência nativa para compilar no host).
 * Exemplo: `const stored = await new ScryptPasswordHasher().hash('minha-senha')`
 */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH)
    const derived = await scryptAsync(password, salt, KEY_LENGTH)
    return [HASH_PREFIX, salt.toString('base64'), derived.toString('base64')].join('$')
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [prefix, saltText, hashText] = storedHash.split('$')
    if (prefix !== HASH_PREFIX || !saltText || !hashText) return false
    const expected = Buffer.from(hashText, 'base64')
    const derived = await scryptAsync(password, Buffer.from(saltText, 'base64'), expected.length)
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  }
}
