import { describe, expect, it, vi } from 'vitest'
import {
  GITHUB_LATEST_RELEASE_URL,
  GITHUB_USER_AGENT,
  ReleasePoller,
  createGithubReleaseLookup,
  startReleasePoller,
  type IntervalHandle,
  type IntervalScheduler,
  type ReleaseLookup,
  type ReleasePollLogger,
  type ReleaseSink,
} from './releasePoller'

class ScriptedReleaseLookup implements ReleaseLookup {
  private index = 0
  error: Error | null = null

  constructor(private readonly tags: string[]) {}

  latestTag(): Promise<string> {
    if (this.error) return Promise.reject(this.error)
    const tag = this.tags[this.index] ?? this.tags.at(-1)
    if (this.index < this.tags.length) this.index += 1
    if (tag === undefined) return Promise.reject(new Error('sem tag no teste'))
    return Promise.resolve(tag)
  }
}

class RecordingReleaseSink implements ReleaseSink {
  readonly versions: string[] = []

  announce(version: string): void {
    this.versions.push(version)
  }
}

class RecordingPollLogger implements ReleasePollLogger {
  readonly messages: string[] = []

  fail(message: string): void {
    this.messages.push(message)
  }
}

class CapturingFetch {
  url = ''
  headers: Record<string, string> = {}
  status = 200
  body: unknown = { tag_name: 'v0.1.10' }

  readonly fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    this.url = url
    this.headers = readHeaders(init?.headers)
    return new Response(JSON.stringify(this.body), { status: this.status })
  }
}

class FakeScheduler implements IntervalScheduler {
  ms = 0
  stopped = false
  private tick: (() => void) | null = null

  every(ms: number, tick: () => void): IntervalHandle {
    this.ms = ms
    this.tick = tick
    return {
      stop: () => {
        this.stopped = true
        this.tick = null
      },
    }
  }

  fire(): void {
    this.tick?.()
  }
}

function readHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers || headers instanceof Headers || Array.isArray(headers)) return {}
  return headers
}

describe('ReleasePoller', () => {
  it('transmite a versão nova uma vez e ignora a repetida', async () => {
    const lookup = new ScriptedReleaseLookup(['v0.1.117', 'v0.1.117', '0.1.118'])
    const sink = new RecordingReleaseSink()
    const poller = new ReleasePoller(lookup, sink, new RecordingPollLogger())

    await expect(poller.tick()).resolves.toBe('announced')
    await expect(poller.tick()).resolves.toBe('unchanged')
    await expect(poller.tick()).resolves.toBe('announced')

    expect(sink.versions, 'só sobe de versão').toEqual(['0.1.117', '0.1.118'])
    expect(poller.currentVersion()).toBe('0.1.118')
  })

  it('não volta para uma tag mais antiga', async () => {
    const lookup = new ScriptedReleaseLookup(['0.1.10', '0.1.9'])
    const sink = new RecordingReleaseSink()
    const poller = new ReleasePoller(lookup, sink, new RecordingPollLogger())

    await poller.tick()
    await expect(poller.tick()).resolves.toBe('unchanged')

    expect(sink.versions).toEqual(['0.1.10'])
    expect(poller.currentVersion()).toBe('0.1.10')
  })

  it('erro de rede não derruba e não apaga a versão já vista', async () => {
    const lookup = new ScriptedReleaseLookup(['v0.1.5'])
    const sink = new RecordingReleaseSink()
    const logger = new RecordingPollLogger()
    const poller = new ReleasePoller(lookup, sink, logger)
    await poller.tick()

    lookup.error = new Error('ECONNRESET')
    await expect(poller.tick()).resolves.toBe('failed')

    expect(poller.currentVersion(), 'a última tag boa continua valendo').toBe('0.1.5')
    expect(sink.versions).toEqual(['0.1.5'])
    expect(logger.messages[0]).toContain('ECONNRESET')
  })

  it('tag que não é semver não transmite', async () => {
    const sink = new RecordingReleaseSink()
    const logger = new RecordingPollLogger()
    const poller = new ReleasePoller(new ScriptedReleaseLookup(['nightly']), sink, logger)

    await expect(poller.tick()).resolves.toBe('failed')

    expect(sink.versions).toEqual([])
    expect(logger.messages[0]).toContain('nightly')
  })
})

describe('createGithubReleaseLookup', () => {
  it('pede a latest release com User-Agent e sem token', async () => {
    const http = new CapturingFetch()

    await expect(createGithubReleaseLookup(http.fetch).latestTag()).resolves.toBe('v0.1.10')

    expect(http.url).toBe(GITHUB_LATEST_RELEASE_URL)
    expect(http.headers['User-Agent']).toBe(GITHUB_USER_AGENT)
    expect(http.headers.Authorization, 'consulta pública').toBeUndefined()
  })

  it('trata limite e resposta ruim como falha', async () => {
    const limited = new CapturingFetch()
    limited.status = 403
    await expect(createGithubReleaseLookup(limited.fetch).latestTag()).rejects.toThrow(/HTTP 403/)

    const missing = new CapturingFetch()
    missing.status = 500
    await expect(createGithubReleaseLookup(missing.fetch).latestTag()).rejects.toThrow(/HTTP 500/)
  })

  it('recusa JSON sem tag_name', async () => {
    const http = new CapturingFetch()
    http.body = { name: 'SoundRoom 0.1.9' }

    await expect(createGithubReleaseLookup(http.fetch).latestTag()).rejects.toThrow(/tag_name/)
  })

  it('estoura o prazo sem pendurar o host', async () => {
    const hanging = (_url: string, init?: RequestInit): Promise<Response> => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('timeout')))
    })

    await expect(createGithubReleaseLookup(hanging, 20).latestTag()).rejects.toThrow(/timeout/)
  })
})

describe('startReleasePoller', () => {
  it('consulta na hora e registra o intervalo', async () => {
    const sink = new RecordingReleaseSink()
    const poller = new ReleasePoller(new ScriptedReleaseLookup(['v0.1.2']), sink, new RecordingPollLogger())
    const scheduler = new FakeScheduler()

    const handle = startReleasePoller(poller, 120_000, scheduler)
    await vi.waitFor(() => expect(sink.versions).toEqual(['0.1.2']))

    expect(scheduler.ms).toBe(120_000)
    handle.stop()
    expect(scheduler.stopped).toBe(true)
  })

  it('o intervalo seguinte consulta de novo e para depois do stop', async () => {
    const lookup = new ScriptedReleaseLookup(['v0.1.2', 'v0.1.3'])
    const sink = new RecordingReleaseSink()
    const poller = new ReleasePoller(lookup, sink, new RecordingPollLogger())
    const scheduler = new FakeScheduler()

    const handle = startReleasePoller(poller, 120_000, scheduler)
    await vi.waitFor(() => expect(sink.versions).toEqual(['0.1.2']))

    scheduler.fire()
    await vi.waitFor(() => expect(sink.versions).toEqual(['0.1.2', '0.1.3']))

    handle.stop()
    scheduler.fire()
    expect(sink.versions).toEqual(['0.1.2', '0.1.3'])
  })
})
