/**
 * Conta conexões por usuário: o mesmo amigo pode abrir o app duas vezes
 * e só fica offline quando a última conexão cai.
 * Exemplo: `if (presence.connect(userId)) broadcaster.emit('presence:changed', { userId, online: true })`
 */
export class PresenceTracker {
  private readonly connectionCounts = new Map<string, number>()

  /** Devolve `true` quando o usuário acabou de ficar online. */
  connect(userId: string): boolean {
    const count = this.connectionCounts.get(userId) ?? 0
    this.connectionCounts.set(userId, count + 1)
    return count === 0
  }

  /** Devolve `true` quando o usuário acabou de ficar offline. */
  disconnect(userId: string): boolean {
    const count = this.connectionCounts.get(userId) ?? 0
    if (count <= 1) {
      this.connectionCounts.delete(userId)
      return count === 1
    }
    this.connectionCounts.set(userId, count - 1)
    return false
  }

  isOnline(userId: string): boolean {
    return this.connectionCounts.has(userId)
  }

  /** Uma pessoa, mesmo com duas janelas. Exemplo: `presence.onlineCount()`. */
  onlineCount(): number {
    return this.connectionCounts.size
  }
}
