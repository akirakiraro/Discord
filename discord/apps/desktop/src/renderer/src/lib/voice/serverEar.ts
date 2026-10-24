import { monitorIdentity } from '@radcord/shared'
import {
  Room,
  RoomEvent,
  SubscriptionError,
  Track,
  type DisconnectReason,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RoomOptions,
} from 'livekit-client'
import { describeVoiceDisconnect } from './describeVoiceDisconnect'
import {
  EAR_WAIT_MS,
  EarClosed,
  EarFailure,
  describeEarElement,
  earDetail,
  emptyEarInput,
  explainEarSilence,
  type EarElementState,
  type EarSilenceInput,
} from './earStatus'

const EAR_ROOM: RoomOptions = { webAudioMix: false, disconnectOnPageLeave: false }

// WAV de 1 amostra em silêncio. O play() no clique libera o autoplay antes da ida ao servidor.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

/**
 * Liga uma segunda conexão, invisível, que só toca o microfone deste usuário
 * depois que o áudio volta do servidor. Falha com mensagem se o som não sair.
 * Exemplo: `const stop = await startServerEar(url, token, userId, abort.signal)`
 */
export async function startServerEar(url: string, token: string, userId: string, signal?: AbortSignal): Promise<() => void> {
  assertMonitorToken(token, userId)
  const room = new Room(EAR_ROOM)
  const wait = new EarWait(url)
  const elements: HTMLMediaElement[] = []
  bindEar(room, wait, userId, elements)
  try {
    throwIfCancelled(signal)
    await room.connect(url, token, { autoSubscribe: false })
    await subscribePublished(room, userId, wait, elements)
    await wait.until(signal)
    return () => shutdown(room, elements, wait)
  } catch (error) {
    shutdown(room, elements, wait)
    throw asEarFailure(error, wait)
  }
}

/**
 * O clique em "Me ouvir" precisa tocar algo ainda dentro do gesto.
 * No outro PC a conexão pela VPN passa do tempo em que o navegador aceita o play() sozinho.
 * Exemplo: `unlockEarOutput()` no onClick, antes de qualquer await.
 */
export function unlockEarOutput(): void {
  if (typeof document === 'undefined') return
  const element = document.createElement('audio')
  element.src = SILENT_WAV
  void element.play().finally(() => element.remove())
}

/**
 * Lê o `sub` do JWT sem validar a assinatura. Serve para não conectar
 * um token da sessão principal, o que derrubaria a chamada.
 * Exemplo: `jwtSubject('aaa.' + payload + '.bbb')`
 */
export function jwtSubject(token: string): string {
  const segment = token.split('.')[1]
  if (!segment) throw new Error(`token "${token}" sem payload; esperado um JWT com três partes`)
  const json = JSON.parse(decodeBase64Url(segment)) as { sub?: unknown }
  if (typeof json.sub !== 'string' || json.sub === '') {
    throw new Error('token sem sub; esperado a identidade do LiveKit')
  }
  return json.sub
}

class EarWait {
  private readonly input: EarSilenceInput = emptyEarInput()
  private settled = false
  private playing = false
  private closed = false
  private resolveDone: () => void = () => {}
  private rejectDone: (error: Error) => void = () => {}
  readonly done: Promise<void>

  constructor(private readonly url: string) {
    this.done = new Promise((resolve, reject) => {
      this.resolveDone = resolve
      this.rejectDone = reject
    })
    void this.done.catch(() => {})
  }

  see(identity: string, userId: string, source: string | undefined): void {
    this.input.remoteCount += 1
    if (identity === userId) this.input.ownSource = source ?? 'sem-microfone'
  }

  beginPlayback(): boolean {
    if (this.playing || this.settled) return false
    this.playing = true
    this.input.sawOwnMic = true
    return true
  }

  succeed(): void {
    this.settle(() => this.resolveDone())
  }

  failSubscribe(message: string): void {
    this.input.subscribeError = message
    this.settle(() => this.rejectDone(this.failure()))
  }

  failPlayback(message: string): void {
    this.input.playbackError = message
    this.settle(() => this.rejectDone(this.failure()))
  }

  failDisconnect(reason: DisconnectReason | undefined): void {
    if (this.closed) return
    this.input.disconnectError = earDisconnectMessage(reason)
    this.settle(() => this.rejectDone(this.failure()))
  }

  until(signal?: AbortSignal): Promise<void> {
    return raceEar(this, signal)
  }

  failure(): EarFailure {
    const message = explainEarSilence(this.input) ?? 'A escuta conectou, mas o retorno não tocou.'
    return new EarFailure(message, this.detail())
  }

  detail(): string {
    return earDetail(this.input, this.url)
  }

  close(): void {
    this.closed = true
  }

  private settle(run: () => void): void {
    if (this.settled) return
    this.settled = true
    run()
  }
}

function bindEar(room: Room, wait: EarWait, userId: string, elements: HTMLMediaElement[]): void {
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    playIfOwn(room, track, publication, participant, userId, wait, elements)
  })
  room.on(RoomEvent.TrackPublished, (publication, participant) => {
    void subscribeOne(room, publication, participant, userId, wait, elements)
  })
  room.on(RoomEvent.TrackSubscriptionFailed, (_sid, participant, error) => {
    if (participant.identity !== userId) return
    wait.failSubscribe(errorText(error))
  })
  room.on(RoomEvent.Disconnected, (reason) => wait.failDisconnect(reason))
}

async function subscribePublished(room: Room, userId: string, wait: EarWait, elements: HTMLMediaElement[]): Promise<void> {
  for (const participant of room.remoteParticipants.values()) {
    const publication = participant.getTrackPublication(Track.Source.Microphone)
    wait.see(participant.identity, userId, publication?.source)
    if (publication) await subscribeOne(room, publication, participant, userId, wait, elements)
  }
}

async function subscribeOne(
  room: Room,
  publication: RemoteTrackPublication,
  participant: RemoteParticipant,
  userId: string,
  wait: EarWait,
  elements: HTMLMediaElement[],
): Promise<void> {
  if (!isOwnMic(participant.identity, userId, publication.source)) return
  try {
    if (!publication.track) await publication.setSubscribed(true)
  } catch (error) {
    wait.failSubscribe(errorText(error))
    return
  }
  if (publication.track) playIfOwn(room, publication.track, publication, participant, userId, wait, elements)
}

function playIfOwn(
  room: Room,
  track: RemoteTrack,
  publication: RemoteTrackPublication,
  participant: RemoteParticipant,
  userId: string,
  wait: EarWait,
  elements: HTMLMediaElement[],
): void {
  if (!isOwnMic(participant.identity, userId, publication.source)) return
  if (!wait.beginPlayback()) return
  void playMounted(room, track, elements).then(
    () => wait.succeed(),
    (error: unknown) => wait.failPlayback(errorText(error)),
  )
}

async function playMounted(room: Room, track: RemoteTrack, elements: HTMLMediaElement[]): Promise<void> {
  const element = mountEarElement(track, elements)
  await room.startAudio()
  const problem = describeEarElement(readElement(element))
  if (problem) throw new Error(problem)
}

function mountEarElement(track: RemoteTrack, elements: HTMLMediaElement[]): HTMLMediaElement {
  const element = document.createElement('audio')
  track.attach(element)
  element.muted = false
  element.volume = 1
  element.autoplay = true
  // Sem o atributo hidden: em alguns Chromium display:none não chega a tocar.
  element.style.position = 'fixed'
  element.style.left = '0'
  element.style.width = '1px'
  element.style.height = '1px'
  element.style.opacity = '0'
  document.body.append(element)
  elements.push(element)
  return element
}

function readElement(element: HTMLMediaElement): EarElementState {
  return { paused: element.paused, muted: element.muted, volume: element.volume, readyState: element.readyState }
}

async function raceEar(wait: EarWait, signal?: AbortSignal): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(wait.failure()), EAR_WAIT_MS)
  })
  try {
    await Promise.race([wait.done, timeout, cancelWhen(signal)])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

function cancelWhen(signal?: AbortSignal): Promise<never> {
  if (!signal) return new Promise(() => {})
  if (signal.aborted) return Promise.reject(new EarClosed())
  return new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new EarClosed()), { once: true })
  })
}

function shutdown(room: Room, elements: HTMLMediaElement[], wait: EarWait): void {
  wait.close()
  for (const element of elements) element.remove()
  void room.disconnect()
}

function asEarFailure(error: unknown, wait: EarWait): Error {
  if (error instanceof EarClosed || error instanceof EarFailure) return error
  const message = error instanceof Error ? error.message : String(error)
  return new EarFailure(`A escuta não conectou: ${message}`, wait.detail())
}

function earDisconnectMessage(reason: DisconnectReason | undefined): string {
  const described = describeVoiceDisconnect(reason)
  return described ? `A escuta caiu: ${described}` : 'A escuta foi encerrada.'
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new EarClosed()
}

function assertMonitorToken(token: string, userId: string): void {
  const identity = jwtSubject(token)
  const expected = monitorIdentity(userId)
  if (identity !== expected) {
    throw new Error(`token de escuta com identidade "${identity}"; esperado "${expected}"`)
  }
}

function isOwnMic(identity: string, userId: string, source: Track.Source): boolean {
  return identity === userId && source === Track.Source.Microphone
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message !== '') return error.message
  if (typeof error === 'string' && error !== '') return error
  if (error === SubscriptionError.SE_CODEC_UNSUPPORTED) return 'codec de áudio não aceito'
  if (error === SubscriptionError.SE_TRACK_NOTFOUND) return 'faixa não encontrada'
  return 'erro desconhecido'
}

function decodeBase64Url(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  return atob(normalized + '='.repeat(padding))
}
