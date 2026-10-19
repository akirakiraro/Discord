const TIME_FORMAT = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * Horário do cabeçalho da mensagem, no fuso local.
 * Exemplo: `formatMessageTimestamp('2026-10-19T17:05:00Z', new Date())` → `'Hoje às 14:05'`
 */
export function formatMessageTimestamp(iso: string, now: Date): string {
  const date = new Date(iso)
  const time = TIME_FORMAT.format(date)
  if (isSameDay(date, now)) return `Hoje às ${time}`
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (isSameDay(date, yesterday)) return `Ontem às ${time}`
  return `${DATE_FORMAT.format(date)} ${time}`
}

/** Exemplo: `formatShortTime('2026-10-19T17:05:00Z')` → `'14:05'` (mensagens agrupadas) */
export function formatShortTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso))
}
