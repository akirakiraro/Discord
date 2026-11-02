import { aimGain, type ScheduledGain } from './micGain'
import { boostCurve, preLimitGain } from './listenerVolume'

export interface BoostAudioNode {
  connect(destination: BoostAudioNode): void
  disconnect(): void
}

export interface BoostGainNode extends BoostAudioNode {
  gain: ScheduledGain
}

export interface BoostShaperNode extends BoostAudioNode {
  curve: Float32Array<ArrayBuffer> | null
  oversample: OverSampleType
}

export interface ListenerBoostGraph {
  currentTime: number
  state: AudioContextState
  resume(): Promise<void>
  createMediaStreamSource(stream: MediaStream): BoostAudioNode
  createGain(): BoostGainNode
  createWaveShaper(): BoostShaperNode
  readonly destination: BoostAudioNode
}

export interface ListenerBoost {
  gain: ScheduledGain
  disconnect(): void
}

interface CallRoomAudio {
  startAudio(): Promise<void>
  audioContext?: AudioContext
}

export interface AttachableAudio {
  kind: string
  attach(element: HTMLMediaElement): HTMLMediaElement
  detach(element: HTMLMediaElement): HTMLMediaElement
}

export interface HeldRemote {
  stream: MediaStream
  release(): void
}

/**
 * Liga ganho e limitador no contexto que a call já abriu.
 * O stream é o srcObject do elemento mudo: um MediaStream novo fica sem som no Chromium.
 * Exemplo: `connectListenerBoost(graph, held.stream, 1.5)`.
 */
export function connectListenerBoost(graph: ListenerBoostGraph, stream: MediaStream, gain: number): ListenerBoost {
  const source = graph.createMediaStreamSource(stream)
  const amp = graph.createGain()
  const shaper = graph.createWaveShaper()
  shaper.curve = boostCurve()
  shaper.oversample = 'none'
  source.connect(amp)
  amp.connect(shaper)
  shaper.connect(graph.destination)
  aimGain(amp.gain, preLimitGain(gain), graph.currentTime)
  if (graph.state === 'suspended') void graph.resume()
  return { gain: amp.gain, disconnect: () => source.disconnect() }
}

/**
 * Segura a faixa remota num elemento mudo e devolve o mesmo srcObject.
 * Sem o elemento o Chromium não entrega o áudio da call ao Web Audio.
 * Exemplo: `const held = holdRemoteForBoost(track, audio)`.
 */
export function holdRemoteForBoost(track: AttachableAudio, element: HTMLAudioElement): HeldRemote {
  assertAudio(track)
  element.volume = 0
  track.attach(element)
  element.muted = true
  element.volume = 0
  try {
    return heldRemote(track, element, streamOf(element.srcObject))
  } catch (error) {
    track.detach(element)
    throw error
  }
}

/**
 * Move o ganho sem trocar a curva. 100% não passa por aqui.
 * Exemplo: `retuneListenerBoost(chain, 2, context.currentTime)`.
 */
export function retuneListenerBoost(chain: ListenerBoost, gain: number, now: number): void {
  aimGain(chain.gain, preLimitGain(gain), now)
}

/**
 * O LiveKit já cria este contexto na entrada da call, com a taxa da placa.
 * O campo é interno do SDK: ler daqui evita um segundo `AudioContext`.
 * Exemplo: `await ensureCallAudioContext(voiceRoom)`.
 */
export async function ensureCallAudioContext(room: CallRoomAudio): Promise<AudioContext> {
  if (!openContext(room.audioContext)) await room.startAudio()
  const context = room.audioContext
  if (!openContext(context)) {
    throw new Error('AudioContext da sala ausente ao aumentar o volume; esperado o contexto que a call já abriu')
  }
  if (context.state === 'suspended') await context.resume()
  return context
}

/** Exemplo: `readCallAudioContext(voiceRoom)?.currentTime`. */
export function readCallAudioContext(room: CallRoomAudio): AudioContext | undefined {
  return openContext(room.audioContext) ? room.audioContext : undefined
}

/** Adapta o contexto da sala ao grafo que o teste também implementa. */
export function asBoostGraph(context: AudioContext): ListenerBoostGraph {
  return {
    get currentTime() {
      return context.currentTime
    },
    get state() {
      return context.state
    },
    resume: () => context.resume(),
    createMediaStreamSource: (stream) => wrapNode(context.createMediaStreamSource(stream)),
    createGain: () => wrapGain(context.createGain()),
    createWaveShaper: () => wrapShaper(context.createWaveShaper()),
    destination: wrapNode(context.destination),
  }
}

function assertAudio(track: AttachableAudio): void {
  if (track.kind === 'audio') return
  throw new Error(`faixa ${track.kind} ao aumentar o volume; esperado áudio`)
}

function heldRemote(track: AttachableAudio, element: HTMLAudioElement, stream: MediaStream): HeldRemote {
  let done = false
  return {
    stream,
    release: () => {
      if (done) return
      done = true
      track.detach(element)
    },
  }
}

function streamOf(value: unknown): MediaStream {
  if (isMediaStream(value)) return value
  const seen = value === null ? 'null' : typeof value
  throw new Error(`faixa remota sem MediaStream ao aumentar o volume; esperado srcObject depois do attach, recebido ${seen}`)
}

function isMediaStream(value: unknown): value is MediaStream {
  if (typeof value !== 'object' || value === null) return false
  const tracks = (value as { getAudioTracks?: unknown }).getAudioTracks
  return typeof tracks === 'function'
}

function openContext(context: AudioContext | undefined): context is AudioContext {
  return context !== undefined && context.state !== 'closed'
}

interface WrappedNode extends BoostAudioNode {
  audioNode: AudioNode
}

function wrapNode(node: AudioNode): WrappedNode {
  return {
    audioNode: node,
    connect: (destination) => {
      node.connect(nodeOf(destination))
    },
    disconnect: () => node.disconnect(),
  }
}

function wrapGain(node: GainNode): BoostGainNode {
  return { ...wrapNode(node), gain: node.gain }
}

function wrapShaper(node: WaveShaperNode): BoostShaperNode {
  return {
    ...wrapNode(node),
    get curve() {
      return node.curve
    },
    set curve(value) {
      node.curve = value
    },
    get oversample() {
      return node.oversample
    },
    set oversample(value) {
      node.oversample = value
    },
  }
}

function nodeOf(node: BoostAudioNode): AudioNode {
  if (!isWrapped(node)) {
    throw new Error('nó de áudio sem AudioNode ao ligar o volume; esperado o adaptador da sala')
  }
  return node.audioNode
}

function isWrapped(node: BoostAudioNode): node is WrappedNode {
  return 'audioNode' in node
}
