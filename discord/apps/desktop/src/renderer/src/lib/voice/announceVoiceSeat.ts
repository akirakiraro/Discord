import type { StoreApi } from 'zustand'
import type { VoiceStore } from '../../stores/voiceStore'

type VoiceChannelStore = Pick<StoreApi<VoiceStore>, 'getState' | 'subscribe'>

export interface VoiceChannelSource {
  current(): string | null
  subscribe(listener: (channelId: string | null) => void): () => void
}

/** O pedaço do socket que anuncia a call. O Socket.IO real encaixa aqui. */
export interface VoiceSeatSocket {
  readonly connected: boolean
  emit(event: 'voice:join', payload: { channelId: string }): void
  emit(event: 'voice:leave'): void
  on(event: 'connect', listener: () => void): void
  off(event: 'connect', listener: () => void): void
}

/**
 * Lê o canal da call no store e só avisa quando ele muda.
 * Exemplo: `voiceChannelSource(useVoiceStore)`
 */
export function voiceChannelSource(store: VoiceChannelStore): VoiceChannelSource {
  return {
    current: () => store.getState().connection?.channelId ?? null,
    subscribe: (listener) =>
      store.subscribe((state, previous) => {
        const nextId = state.connection?.channelId ?? null
        const previousId = previous.connection?.channelId ?? null
        if (nextId !== previousId) listener(nextId)
      }),
  }
}

/**
 * Avisa o host do canal atual. Se o socket caiu, espera o `connect` e reanuncia,
 * porque o assento antigo morre com o socket.
 * Exemplo: `const stop = bindVoiceAnnouncements(socket, voiceChannelSource(useVoiceStore))`
 */
export function bindVoiceAnnouncements(socket: VoiceSeatSocket, source: VoiceChannelSource): () => void {
  const onConnect = (): void => {
    const channelId = source.current()
    if (channelId) socket.emit('voice:join', { channelId })
  }
  socket.on('connect', onConnect)
  const unsubscribe = source.subscribe((channelId) => publishSeat(socket, channelId))
  return () => {
    socket.off('connect', onConnect)
    unsubscribe()
  }
}

function publishSeat(socket: VoiceSeatSocket, channelId: string | null): void {
  if (!socket.connected) return
  if (channelId) socket.emit('voice:join', { channelId })
  else socket.emit('voice:leave')
}
