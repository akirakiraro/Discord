export const HOST_LOG_MAX_BYTES = 1_000_000
export const HOST_LOG_TAIL_LINES = 40

export interface LogFiles {
  size(path: string): number
  rename(from: string, to: string): void
  append(path: string, text: string): void
}

/**
 * Passou de 1 MB: o arquivo vira `.1` e o próximo append começa outro.
 * Exemplo: `shouldRotateLog(1_000_000)` → `true`.
 */
export function shouldRotateLog(size: number): boolean {
  return size >= HOST_LOG_MAX_BYTES
}

/** Exemplo: `rotatedLogPath('api.log')` → `'api.log.1'`. */
export function rotatedLogPath(path: string): string {
  return `${path}.1`
}

/**
 * Guarda uma cópia e segue. Exemplo: `appendCappedLog(files, path, 'linha\n')`.
 */
export function appendCappedLog(files: LogFiles, path: string, text: string): void {
  if (shouldRotateLog(files.size(path))) files.rename(path, rotatedLogPath(path))
  files.append(path, text)
}

/**
 * As últimas 40 linhas não vazias. Exemplo: `logTail(text)`.
 */
export function logTail(text: string, lines: number = HOST_LOG_TAIL_LINES): string[] {
  const all = text.split(/\r?\n/).filter((line) => line.length > 0)
  return all.slice(-lines)
}
