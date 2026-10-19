export interface RecordedHostCall {
  url: string
  init: RequestInit | undefined
}

export class FakeHostFetch {
  readonly calls: RecordedHostCall[] = []

  constructor(private readonly respond: () => Response) {}

  readonly fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    this.calls.push({ url, init })
    return this.respond()
  }

  lastHeaders(): Record<string, string> {
    return (this.calls.at(-1)?.init?.headers ?? {}) as Record<string, string>
  }
}

export class OfflineHostFetch {
  readonly fetch = async (): Promise<Response> => {
    throw new TypeError('Failed to fetch')
  }
}
