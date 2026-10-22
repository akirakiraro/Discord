import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export const DEFAULT_WINDOW_SIZE = { width: 1200, height: 760 }
const MIN_WINDOW_SIZE = { width: 900, height: 560 }
const MIN_VISIBLE_PX = 80

export type WindowBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type WindowPlacement = WindowBounds & {
  maximized: boolean
  fullscreen: boolean
}

export type PlacementSource = {
  getNormalBounds(): WindowBounds
  isMaximized(): boolean
  isFullScreen(): boolean
}

/**
 * Medidas da janela restaurada, mais se ela estava maximizada ou em tela cheia.
 * Exemplo: `placementFromWindow(window)`
 */
export function placementFromWindow(source: PlacementSource): WindowPlacement {
  const bounds = source.getNormalBounds()
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    maximized: source.isMaximized(),
    fullscreen: source.isFullScreen(),
  }
}

export type PlacementMemory = {
  noteMaximized(value: boolean): void
  noteFullscreen(value: boolean): void
  noteBounds(bounds: WindowBounds): void
  current(): WindowPlacement
}

/**
 * Guarda o modo da janela fora do getter do Electron.
 * No Windows, isMaximized() mente dentro do evento close.
 * Exemplo: `rememberPlacement(saved).noteFullscreen(true)`
 */
export function rememberPlacement(initial: WindowPlacement): PlacementMemory {
  let placement = initial
  return {
    noteMaximized(maximized: boolean) {
      placement = { ...placement, maximized }
    },
    noteFullscreen(fullscreen: boolean) {
      placement = { ...placement, fullscreen }
    },
    noteBounds(bounds: WindowBounds) {
      placement = { ...placement, ...bounds }
    },
    current() {
      return placement
    },
  }
}

/**
 * Lê o último tamanho. Arquivo ausente ou inválido devolve null.
 * Exemplo: `readWindowPlacement(path)`
 */
export function readWindowPlacement(filePath: string): WindowPlacement | null {
  try {
    return asPlacement(JSON.parse(readFileSync(filePath, 'utf8')))
  } catch {
    return null
  }
}

/**
 * Grava o tamanho para a próxima abertura.
 * Exemplo: `writeWindowPlacement(path, placement)`
 */
export function writeWindowPlacement(filePath: string, placement: WindowPlacement): void {
  try {
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify(placement))
  } catch {
    // Falha de disco não pode impedir a janela de fechar.
  }
}

/**
 * Mantém o tamanho salvo se ele ainda aparece em algum monitor.
 * Tela cheia ou maximizado fora da tela volta para o primeiro monitor.
 * Exemplo: `launchPlacement(saved, screen.getAllDisplays().map(d => d.workArea))`
 */
export function launchPlacement(saved: WindowPlacement | null, displays: WindowBounds[]): WindowPlacement | null {
  if (!saved) return null
  if (displays.length === 0 || windowVisible(saved, displays)) return saved
  if (!saved.fullscreen && !saved.maximized) return null
  const first = displays[0]
  return first ? { ...saved, x: first.x, y: first.y } : saved
}

function asPlacement(value: unknown): WindowPlacement | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const bounds = asBounds(record)
  if (!bounds) return null
  return { ...bounds, maximized: record.maximized === true, fullscreen: record.fullscreen === true }
}

function asBounds(record: Record<string, unknown>): WindowBounds | null {
  const x = finite(record.x)
  const y = finite(record.y)
  const width = finite(record.width)
  const height = finite(record.height)
  if (x === null || y === null || width === null || height === null) return null
  if (width < MIN_WINDOW_SIZE.width || height < MIN_WINDOW_SIZE.height) return null
  if (width > 16000 || height > 16000 || Math.abs(x) > 32000 || Math.abs(y) > 32000) return null
  return { x, y, width, height }
}

function finite(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.round(value)
}

function windowVisible(bounds: WindowBounds, displays: WindowBounds[]): boolean {
  return displays.some((area) => overlapAtLeast(bounds, area, MIN_VISIBLE_PX))
}

function overlapAtLeast(a: WindowBounds, b: WindowBounds, minimum: number): boolean {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return width >= minimum && height >= minimum
}
