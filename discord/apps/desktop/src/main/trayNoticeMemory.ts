import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * O aviso da bandeja sai uma vez na vida. O arquivo existir é o "já vi".
 * Exemplo: `hasSeenTrayNotice(join(userData, 'tray-notice-seen'))`
 */
export function hasSeenTrayNotice(filePath: string): boolean {
  return existsSync(filePath)
}

/**
 * Grava que o aviso já saiu. Falha de disco não impede esconder a janela.
 * Exemplo: `markTrayNoticeSeen(join(userData, 'tray-notice-seen'))`
 */
export function markTrayNoticeSeen(filePath: string): void {
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, '1')
  } catch {
    // Sem disco o aviso volta na próxima abertura; nesta sessão o app já lembra em memória.
  }
}
