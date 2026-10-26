import type { HostSnapshot } from '../../shared/hostSnapshot'
import { closeWarning } from './hostMessages'

export type AppClosePlan =
  | { kind: 'quit' }
  | { kind: 'stop-then-quit' }
  | { kind: 'confirm'; online: number; inVoice: number; message: string }

/**
 * Fechar o app com o host que ele mesmo ligou. Com gente na call, pede confirmação.
 * Exemplo: `planAppClose(snapshot)`.
 */
export function planAppClose(snapshot: HostSnapshot): AppClosePlan {
  if (!snapshot.ownedByApp || (snapshot.phase !== 'on' && snapshot.phase !== 'starting')) return { kind: 'quit' }
  if (snapshot.online > 0 || snapshot.inVoice > 0) {
    return {
      kind: 'confirm',
      online: snapshot.online,
      inVoice: snapshot.inVoice,
      message: closeWarning(snapshot.online, snapshot.inVoice),
    }
  }
  return { kind: 'stop-then-quit' }
}

/**
 * A atualização fecha o app. Enquanto o host deste app está no ar, ela espera.
 * Exemplo: `hostBlocksInstall(snapshot)`.
 */
export function hostBlocksInstall(snapshot: HostSnapshot): boolean {
  if (!snapshot.ownedByApp) return false
  return snapshot.phase === 'on' || snapshot.phase === 'starting' || snapshot.phase === 'stopping'
}
