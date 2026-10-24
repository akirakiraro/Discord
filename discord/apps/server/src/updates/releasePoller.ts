import { normalizeReleaseVersion, isNewerRelease } from '@radcord/shared'

export const GITHUB_LATEST_RELEASE_URL = 'https://api.github.com/repos/akirakiraro/Discord/releases/latest'
export const GITHUB_USER_AGENT = 'radcord-host'
export const DEFAULT_RELEASE_POLL_MS = 120_000
const DEFAULT_TIMEOUT_MS = 8_000

export interface ReleaseLookup {
  latestTag(): Promise<string>
}

export interface ReleaseSink {
  announce(version: string): void
}

export interface ReleasePollLogger {
  fail(message: string): void
}

export interface IntervalHandle {
  stop(): void
}

export interface IntervalScheduler {
  every(ms: number, tick: () => void): IntervalHandle
}

const consoleReleaseLogger: ReleasePollLogger = {
  fail(message) {
    console.error(JSON.stringify({ event: 'release_poll_failed', message }))
  },
}

/**
 * Uma consulta aos Releases públicos. Sem token: o limite anônimo do GitHub basta para um host.
 * Exemplo: `await createGithubReleaseLookup(fetch).latestTag()`
 */
export type ReleaseFetch = (url: string, init?: RequestInit) => Promise<Response>

export function createGithubReleaseLookup(fetchFn: ReleaseFetch = defaultReleaseFetch, timeoutMs = DEFAULT_TIMEOUT_MS): ReleaseLookup {
  return {
    latestTag: () => readLatestTag(fetchFn, timeoutMs),
  }
}

function defaultReleaseFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, init)
}

/**
 * Lembra a última tag e só avisa quando ela sobe.
 * Exemplo: `await new ReleasePoller(lookup, sink).tick()`
 */
export class ReleasePoller {
  private known: string | null = null

  constructor(
    private readonly lookup: ReleaseLookup,
    private readonly sink: ReleaseSink,
    private readonly logger: ReleasePollLogger = consoleReleaseLogger,
  ) {}

  currentVersion(): string | null {
    return this.known
  }

  /** Uma consulta. Erro de rede, limite ou tag estranha não propaga. */
  async tick(): Promise<'announced' | 'unchanged' | 'failed'> {
    const tag = await this.readTag()
    if (tag === null) return 'failed'
    const version = normalizeReleaseVersion(tag)
    if (!version) {
      this.noteFailure(`tag_name inválida: recebido ${JSON.stringify(tag)}, esperado v0.1.N`)
      return 'failed'
    }
    if (this.known !== null && !isNewerRelease(version, this.known)) return 'unchanged'
    this.known = version
    this.sink.announce(version)
    return 'announced'
  }

  private async readTag(): Promise<string | null> {
    try {
      return await this.lookup.latestTag()
    } catch (error: unknown) {
      this.noteFailure(error instanceof Error ? error.message : String(error))
      return null
    }
  }

  private noteFailure(message: string): void {
    this.logger.fail(message)
  }
}

/**
 * Primeira consulta na hora, depois no intervalo. O timer não segura o processo.
 * Exemplo: `startReleasePoller(poller, config.releasePollMs)`
 */
export function startReleasePoller(
  poller: ReleasePoller,
  intervalMs: number,
  scheduler: IntervalScheduler = systemInterval(),
): IntervalHandle {
  const handle = scheduler.every(intervalMs, () => {
    void safeTick(poller)
  })
  void safeTick(poller)
  return handle
}

async function readLatestTag(fetchFn: ReleaseFetch, timeoutMs: number): Promise<string> {
  const response = await fetchFn(GITHUB_LATEST_RELEASE_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': GITHUB_USER_AGENT,
    },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (response.status === 403 || response.status === 429) {
    throw new Error(`GitHub limitou a consulta: HTTP ${response.status} em ${GITHUB_LATEST_RELEASE_URL}`)
  }
  if (!response.ok) {
    throw new Error(`GitHub respondeu HTTP ${response.status} em ${GITHUB_LATEST_RELEASE_URL}, esperado 200`)
  }
  return tagName(await response.json())
}

function tagName(body: unknown): string {
  if (!body || typeof body !== 'object' || !('tag_name' in body) || typeof body.tag_name !== 'string') {
    throw new Error(`Resposta do GitHub sem tag_name: recebido ${JSON.stringify(body)}, esperado { tag_name: string }`)
  }
  return body.tag_name
}

async function safeTick(poller: ReleasePoller): Promise<void> {
  try {
    await poller.tick()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(JSON.stringify({ event: 'release_poll_failed', message }))
  }
}

function systemInterval(): IntervalScheduler {
  return {
    every(ms, tick) {
      const timer = setInterval(tick, ms)
      timer.unref()
      return { stop: () => clearInterval(timer) }
    },
  }
}
