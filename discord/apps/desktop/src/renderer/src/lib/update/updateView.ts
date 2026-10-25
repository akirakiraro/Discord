import { PRODUCT_DISPLAY_NAME } from '../../../../shared/appIdentity'
import type { UpdateProgress, UpdateSnapshot } from '../../../../shared/desktopUpdateSnapshot'

/**
 * Texto do cartão no canto. Exemplo: `updateCardTitle(snapshot)`.
 */
export function updateCardTitle(snapshot: UpdateSnapshot): string {
  if (snapshot.phase === 'checking') return 'Verificando atualização'
  if (snapshot.phase === 'downloading') return snapshot.version ? `Baixando ${snapshot.version}` : 'Baixando atualização'
  if (snapshot.phase === 'ready') return 'Pronto para instalar'
  if (snapshot.phase === 'installing') return 'Instalando...'
  return 'Atualização pendente'
}

/** Linha de detalhe do cartão. `null` quando a fase não tem o que mostrar. */
export function updateCardDetail(snapshot: UpdateSnapshot): string | null {
  if (snapshot.phase === 'checking') return 'Consultando os releases do GitHub…'
  if (snapshot.phase === 'downloading') return formatUpdateProgress(snapshot.progress)
  if (snapshot.phase === 'ready') return '100%'
  if (snapshot.phase === 'installing') return installingDetail()
  if (snapshot.phase === 'error') return snapshot.message
  return null
}

/** Porcentagem da barra. `null` fora do download e do pronto, inclusive em `installing`. */
export function updatePercent(snapshot: UpdateSnapshot): number | null {
  if (snapshot.phase === 'ready') return 100
  if (snapshot.phase !== 'downloading') return null
  return snapshot.progress?.percent ?? 0
}

/**
 * A fase instalando não tem porcentagem: o NSIS não informa o progresso da troca.
 * Exemplo: `updateIsIndeterminate(snapshot)`
 */
export function updateIsIndeterminate(snapshot: UpdateSnapshot): boolean {
  return snapshot.phase === 'installing'
}

export function updateBlockBody(snapshot: UpdateSnapshot): string {
  if (snapshot.phase === 'error') return snapshot.message ?? `Não foi possível atualizar o ${PRODUCT_DISPLAY_NAME}. Tente de novo.`
  if (snapshot.phase === 'installing') return `Instalando... o ${PRODUCT_DISPLAY_NAME} vai fechar e reabrir sozinho.`
  if (snapshot.phase === 'ready') return 'A atualização está pronta. Confirme para reiniciar.'
  return 'O login abre quando esta versão estiver em dia.'
}

function installingDetail(): string {
  return `O ${PRODUCT_DISPLAY_NAME} vai fechar e reabrir sozinho.`
}

/**
 * Exemplo: `formatUpdateProgress({ percent: 40, bytesPerSecond: 2048, transferred: 400, total: 1000 })`
 */
export function formatUpdateProgress(progress: UpdateProgress | null): string {
  if (!progress) return '0%'
  const parts = [`${Math.round(progress.percent)}%`]
  if (progress.bytesPerSecond > 0) parts.push(`${formatByteSize(progress.bytesPerSecond)}/s`)
  if (progress.total > 0) parts.push(`${formatByteSize(progress.transferred)} de ${formatByteSize(progress.total)}`)
  return parts.join(' · ')
}

export function formatByteSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = nonNegative(bytes)
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 ? 0 : 1
  const shown = unit === 0 ? String(Math.round(value)) : value.toFixed(digits).replace('.', ',')
  return `${shown} ${units[unit] ?? 'B'}`
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}
