import { desktopCapturer, ipcMain, type DesktopCapturerSource } from 'electron'

export type ScreenSourceKind = 'screen' | 'window'

export interface ScreenSourceOption {
  id: string
  name: string
  kind: ScreenSourceKind
  thumbnailUrl: string
}

const THUMBNAIL = { width: 320, height: 180 }

let pendingSourceId: string | null = null

/**
 * Lista monitores e janelas para o seletor do renderer.
 * Exemplo: `const sources = await listScreenSources()`
 */
export async function listScreenSources(): Promise<ScreenSourceOption[]> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: THUMBNAIL,
  })
  return sources.map(toScreenOption)
}

/**
 * Guarda a fonte até o próximo `getDisplayMedia` consumir.
 * Exemplo: `rememberScreenSource('screen:0:0')`
 */
export function rememberScreenSource(sourceId: string): void {
  pendingSourceId = sourceId
}

/**
 * Devolve a fonte escolhida uma única vez. Sem escolha, o handler cancela a captura.
 * Exemplo: `const source = await findChosenSource()`
 */
export async function findChosenSource(): Promise<DesktopCapturerSource | undefined> {
  const sourceId = pendingSourceId
  pendingSourceId = null
  if (!sourceId) return undefined
  const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] })
  return sources.find((source) => source.id === sourceId)
}

/** Expõe a lista e a escolha pendente ao renderer. Exemplo: `exposeScreenShareIpc()` */
export function exposeScreenShareIpc(): void {
  ipcMain.handle('radcord:screen-sources', () => listScreenSources())
  ipcMain.handle('radcord:screen-source-choice', (_event, sourceId: unknown) => {
    assertSourceId(sourceId)
    rememberScreenSource(sourceId)
  })
}

function toScreenOption(source: DesktopCapturerSource): ScreenSourceOption {
  return {
    id: source.id,
    name: source.name,
    kind: source.id.startsWith('screen:') ? 'screen' : 'window',
    thumbnailUrl: source.thumbnail.toDataURL(),
  }
}

function assertSourceId(sourceId: unknown): asserts sourceId is string {
  if (typeof sourceId === 'string' && sourceId.length > 0) return
  throw new Error(`sourceId inválido: ${String(sourceId)}; esperado id não vazio`)
}
