const HOST_BASE = /^http:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i

export interface BlockUpdateClient {
  setFeedURL(url: string): void
  checkForUpdates(): Promise<{ version: string } | null>
  downloadUpdate(): Promise<void>
  quitAndInstall(): void
}

export interface BlockUpdateRequest {
  packaged: boolean
  baseUrl: string
  confirm: (version: string) => Promise<boolean>
  client: BlockUpdateClient
}

/**
 * Monta a URL do feed genérico que o electron-updater lê (`latest.yml` e o blockmap).
 * Exemplo: `updatesFeedUrl('http://26.186.21.58:3000')` → `'http://26.186.21.58:3000/updates'`
 */
export function updatesFeedUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!HOST_BASE.test(trimmed)) {
    throw new Error(`Host da atualização inválido: recebido ${JSON.stringify(baseUrl)}, esperado http://IP:porta`)
  }
  return `${trimmed}/updates`
}

/**
 * No app instalado, pergunta ao host e baixa só os blocos novos antes de reiniciar.
 * Exemplo: `await installBlockUpdate({ packaged: true, baseUrl, confirm, client })`
 */
export async function installBlockUpdate(input: BlockUpdateRequest): Promise<string> {
  if (!input.packaged) return 'skipped'
  const offer = await readOffer(input)
  if (!offer) return 'unavailable'
  if (!(await input.confirm(offer.version))) return 'declined'
  await input.client.downloadUpdate()
  input.client.quitAndInstall()
  return 'installed'
}

async function readOffer(input: BlockUpdateRequest): Promise<{ version: string } | null> {
  try {
    input.client.setFeedURL(updatesFeedUrl(input.baseUrl))
    return await input.client.checkForUpdates()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ event: 'desktop_update_check_failed', message }))
    return null
  }
}
