export interface DesktopWindow {
  pid: number
  left: number
  top: number
  right: number
  bottom: number
}

export interface DisplayBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Lê o HWND de um id `window:<hwnd>:<flag>` do Electron.
 * Exemplo: `windowHandle('window:4400:0')` devolve `'4400'`.
 */
export function windowHandle(sourceId: string): string | null {
  const [kind, handle] = sourceId.split(':')
  if (kind !== 'window' || !/^\d+$/.test(handle ?? '')) return null
  return handle
}

/**
 * Converte a lista `pid left top right bottom` do helper.
 * Exemplo: `parseWindowLines('10 0 0 20 20\\n')`.
 */
export function parseWindowLines(text: string): DesktopWindow[] {
  return text.split(/\r?\n/).flatMap(parseWindowLine)
}

/**
 * Processos com janela dentro do monitor, sem o próprio app.
 * Exemplo: `pidsOnDisplay(windows, { x: 0, y: 0, width: 800, height: 600 }, 1, new Set([4]))`.
 */
export function pidsOnDisplay(
  windows: readonly DesktopWindow[],
  display: DisplayBounds,
  scale: number,
  skip: ReadonlySet<number>,
): number[] {
  const left = display.x * scale
  const top = display.y * scale
  const right = left + display.width * scale
  const bottom = top + display.height * scale
  const pids = new Set<number>()
  for (const win of windows) {
    if (skip.has(win.pid) || win.pid <= 0) continue
    const overlaps = win.left < right && win.right > left && win.top < bottom && win.bottom > top
    if (overlaps) pids.add(win.pid)
  }
  return [...pids]
}

/**
 * Soma faixas PCM 16-bit e divide pela quantidade, para não estourar.
 * Exemplo: `mixPcm([left, right])`.
 */
export function mixPcm(chunks: readonly Buffer[]): Buffer {
  if (chunks.length === 0) return Buffer.alloc(0)
  const length = Math.min(...chunks.map((chunk) => chunk.length - (chunk.length % 2)))
  const mixed = Buffer.alloc(length)
  for (let offset = 0; offset < length; offset += 2) mixed.writeInt16LE(clampedSum(chunks, offset), offset)
  return mixed
}

function parseWindowLine(line: string): DesktopWindow[] {
  const [pid, left, top, right, bottom] = line.trim().split(' ').map(Number)
  if (![pid, left, top, right, bottom].every(Number.isFinite)) return []
  return [{ pid, left, top, right, bottom }]
}

function clampedSum(chunks: readonly Buffer[], offset: number): number {
  const sum = chunks.reduce((total, chunk) => total + chunk.readInt16LE(offset), 0)
  return Math.max(-32768, Math.min(32767, Math.round(sum / chunks.length)))
}
