import type {
  ApiErrorResponse,
  AuthResponse,
  ChannelDto,
  CreateChannelRequest,
  JoinRequest,
  MemberDto,
  ProfileUpdate,
  MessageDto,
  MessagePageDto,
  UserDto,
  VoiceTokenResponse,
} from '@radcord/shared'

export type FetchFunction = (url: string, init?: RequestInit) => Promise<Response>

// `fetch` solto como método perde o `this` e o Chromium lança "Illegal invocation".
const browserFetch: FetchFunction = (url, init) => fetch(url, init)
const REQUEST_TIMEOUT_MS = 8000

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

/**
 * Cliente da API do host. Sem token serve só para entrar pelo nome.
 * Exemplo: `const api = new RadcordApiClient('http://26.186.21.58:3000', token); await api.listChannels()`
 */
export class RadcordApiClient {
  constructor(
    readonly baseUrl: string,
    private readonly token: string | null = null,
    private readonly fetchFn: FetchFunction = browserFetch,
  ) {}

  withToken(token: string): RadcordApiClient {
    return new RadcordApiClient(this.baseUrl, token, this.fetchFn)
  }

  join(request: JoinRequest): Promise<AuthResponse> {
    return this.request('POST', '/auth/join', request)
  }

  me(): Promise<UserDto> {
    return this.request('GET', '/auth/me')
  }

  updateProfile(patch: ProfileUpdate): Promise<UserDto> {
    return this.request('PATCH', '/auth/me', patch)
  }

  logout(): Promise<void> {
    return this.request('POST', '/auth/logout')
  }

  listChannels(): Promise<ChannelDto[]> {
    return this.request('GET', '/channels')
  }

  createChannel(request: CreateChannelRequest): Promise<ChannelDto> {
    return this.request('POST', '/channels', request)
  }

  listMessages(channelId: string, beforeId?: string): Promise<MessagePageDto> {
    const query = beforeId ? `?before=${encodeURIComponent(beforeId)}` : ''
    return this.request('GET', `/channels/${channelId}/messages${query}`)
  }

  sendMessage(channelId: string, content: string, imageUrl?: string | null): Promise<MessageDto> {
    const body = imageUrl ? { content, imageUrl } : { content }
    return this.request('POST', `/channels/${channelId}/messages`, body)
  }

  editMessage(messageId: string, content: string, imageUrl?: string | null): Promise<MessageDto> {
    const body = imageUrl ? { content, imageUrl } : { content }
    return this.request('PATCH', `/messages/${messageId}`, body)
  }

  deleteMessage(messageId: string): Promise<void> {
    return this.request('DELETE', `/messages/${messageId}`)
  }

  listMembers(): Promise<MemberDto[]> {
    return this.request('GET', '/members')
  }

  requestVoiceToken(channelId: string, monitor = false): Promise<VoiceTokenResponse> {
    const body = monitor ? { channelId, monitor: true } : { channelId }
    return this.request('POST', '/voice/token', body)
  }

  private async request<T>(method: string, path: string, body?: object): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await this.fetchFn(url, this.buildInit(method, body)).catch((error: unknown) => {
      throw new ApiRequestError(0, 'host_unreachable', `Não foi possível falar com o host em ${url} (${String(error)}). O host está ligado e no Radmin?`)
    })
    if (response.status === 204) return undefined as T
    if (!response.ok) throw await toApiRequestError(response, url)
    return (await response.json()) as T
  }

  private buildInit(method: string, body: object | undefined): RequestInit {
    // Sem corpo não pode ir content-type JSON: o Fastify responde 400 para corpo vazio.
    const headers: Record<string, string> = body ? { 'content-type': 'application/json' } : {}
    if (this.token) headers.authorization = `Bearer ${this.token}`
    const init: RequestInit = { method, headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
    return body ? { ...init, body: JSON.stringify(body) } : init
  }
}

async function toApiRequestError(response: Response, url: string): Promise<ApiRequestError> {
  const text = await response.text()
  try {
    const parsed = JSON.parse(text) as ApiErrorResponse
    return new ApiRequestError(response.status, parsed.error, parsed.message)
  } catch {
    return new ApiRequestError(response.status, 'unexpected_response', `Host respondeu ${response.status} em ${url}: ${text}`)
  }
}
