import {
  CALL_CHIME_DEDUPE_MS,
  SELF_CHIME_ID,
  callChimeRole,
  emptyCallChime,
  reduceCallChime,
  seedCallChime,
  type CallChimeEvent,
  type CallChimePolicy,
  type CallChimeState,
  type CallSoundKind,
} from './callChime'

export interface CallSoundPrefs {
  callSounds: boolean
  callSoundVolume: number
}

export interface CallChimePlayerPort {
  prime(): void
  play(kind: CallSoundKind, volume: number, sinkId: string | null): void
}

/** O que a sessão de voz chama. A decisão mora em `reduceCallChime`. */
export interface CallChimeGatePort {
  prime(): void
  onJoined(identities: readonly string[]): void
  onLeft(): void
  onRemote(kind: CallSoundKind, identity: string, participantKind?: string | number): void
  holdReconnect(): void
  releaseReconnect(identities: readonly string[]): void
}

export interface CallChimeDeps {
  prefs: () => CallSoundPrefs
  silenced: () => boolean
  sinkId: () => string | null
  now: () => number
  /** A saída espera o fim do turno: o LiveKit avisa a reconexão ainda na mesma pilha. */
  soon: (run: () => void) => void
  player: CallChimePlayerPort
  dedupeMs?: number
}

/**
 * Liga a decisão dos sons à sala. A rajada de quem já estava fica muda,
 * e a reconexão do LiveKit não toca saída e entrada de todo mundo.
 * Exemplo: `gate.onJoined(['ana'])` toca só a entrada de quem chegou agora.
 */
export class CallChimeGate implements CallChimeGatePort {
  private state: CallChimeState = emptyCallChime()
  private inCall = false
  private reconnecting = false
  private flushQueued = false
  private queuedLeaves: CallChimeEvent[] = []

  constructor(private readonly deps: CallChimeDeps) {}

  prime(): void {
    try {
      this.deps.player.prime()
    } catch {
      // O clique de entrar não pode falhar porque o contexto de áudio falhou.
    }
  }

  onJoined(identities: readonly string[]): void {
    this.reconnecting = false
    this.dropQueuedLeaves()
    this.state = withSelfMark(seedCallChime(identities), this.state)
    this.inCall = true
    this.playLocal('join')
  }

  onLeft(): void {
    this.reconnecting = false
    this.dropQueuedLeaves()
    if (!this.inCall) return
    this.inCall = false
    this.playLocal('leave')
  }

  onRemote(kind: CallSoundKind, identity: string, participantKind?: string | number): void {
    if (!this.inCall) return
    const event = this.remoteEvent(kind, identity, participantKind)
    if (kind === 'leave') {
      this.queueLeave(event)
      return
    }
    this.apply(event)
  }

  /** O LiveKit tirou todo mundo para reconectar. A saída fica suspensa até sabermos quem voltou. */
  holdReconnect(): void {
    this.reconnecting = true
  }

  /**
   * Quem não voltou toca a saída. Quem voltou já estava em `known` e fica mudo.
   * Exemplo: `gate.releaseReconnect(['ana'])` depois de ana e bob sumirem na reconexão.
   */
  releaseReconnect(identities: readonly string[]): void {
    this.reconnecting = false
    if (!this.inCall) return
    const present = new Set(seedCallChime(identities).known)
    const missing = this.state.known.filter((identity) => !present.has(identity))
    for (const identity of missing) this.apply(this.remoteEvent('leave', identity))
  }

  private queueLeave(event: CallChimeEvent): void {
    this.queuedLeaves.push(event)
    if (this.flushQueued) return
    this.flushQueued = true
    this.deps.soon(() => this.flushLeaves())
  }

  private flushLeaves(): void {
    this.flushQueued = false
    const queued = this.queuedLeaves
    this.queuedLeaves = []
    if (!this.inCall || this.reconnecting) return
    for (const event of queued) this.apply(event)
  }

  private dropQueuedLeaves(): void {
    this.queuedLeaves = []
  }

  private playLocal(kind: CallSoundKind): void {
    this.apply({ kind, identity: SELF_CHIME_ID, local: true, role: 'person', at: this.deps.now() })
  }

  private remoteEvent(kind: CallSoundKind, identity: string, participantKind?: string | number): CallChimeEvent {
    return { kind, identity, local: false, role: callChimeRole(identity, participantKind), at: this.deps.now() }
  }

  private apply(event: CallChimeEvent): void {
    const step = reduceCallChime(this.state, event, this.policy())
    this.state = step.state
    if (step.play) this.safePlay(step.play)
  }

  private policy(): CallChimePolicy {
    return {
      enabled: this.deps.prefs().callSounds,
      silenced: this.deps.silenced(),
      dedupeMs: this.deps.dedupeMs ?? CALL_CHIME_DEDUPE_MS,
    }
  }

  private safePlay(kind: CallSoundKind): void {
    try {
      this.deps.player.play(kind, this.deps.prefs().callSoundVolume, this.deps.sinkId())
    } catch {
      // O som é acessório. A call segue se o alto-falante falhar.
    }
  }
}

function withSelfMark(next: CallChimeState, previous: CallChimeState): CallChimeState {
  const selfMark = previous.recent[SELF_CHIME_ID]
  if (!selfMark) return next
  return { ...next, recent: { [SELF_CHIME_ID]: selfMark } }
}
