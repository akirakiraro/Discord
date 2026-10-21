export interface GithubUpdateFeed {
  provider: 'github'
  owner: string
  repo: string
}

/** Releases públicos de akirakiraro/Discord. O dev não consulta isso porque o app não está empacotado. */
export const GITHUB_UPDATE_FEED: GithubUpdateFeed = {
  provider: 'github',
  owner: 'akirakiraro',
  repo: 'Discord',
}

export interface BlockUpdateClient {
  setFeed(feed: GithubUpdateFeed): void
  checkForUpdates(): Promise<{ version: string } | null>
  downloadUpdate(): Promise<void>
  quitAndInstall(): void
}

export interface BlockUpdateRequest {
  packaged: boolean
  confirm: (version: string) => Promise<boolean>
  client: BlockUpdateClient
}

/**
 * No app instalado, pergunta aos releases do GitHub e baixa só os blocos novos.
 * Exemplo: `await installBlockUpdate({ packaged: true, confirm, client })`
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
    input.client.setFeed(GITHUB_UPDATE_FEED)
    return await input.client.checkForUpdates()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ event: 'desktop_update_check_failed', message }))
    return null
  }
}
