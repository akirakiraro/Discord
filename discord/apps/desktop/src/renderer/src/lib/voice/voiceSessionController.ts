import { ConnectionState, RoomEvent, type AudioCaptureOptions, type DisconnectReason } from 'livekit-client'
import type { StoreApi } from 'zustand'
import type { VoiceTokenResponse } from '@radcord/shared'
import { isMicrophoneLive, type VoiceStore } from '../../stores/voiceStore'
import { describeVoiceDisconnect } from './describeVoiceDisconnect'

export const MICROPHONE_OPTIONS: AudioCaptureOptions = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

/** O pedaço da `Room` do LiveKit que o controlador usa (permite um fake nos testes). */
export interface VoiceRoomPort {
  readonly state: ConnectionState
  readonly localParticipant: {
    setMicrophoneEnabled(enabled: boolean, options?: AudioCaptureOptions): Promise<unknown>
  }
  connect(url: string, token: string): Promise<void>
  disconnect(): Promise<void>
  on(event: RoomEvent.Disconnected, listener: (reason?: DisconnectReason) => void): unknown
}

export interface VoiceTokenSource {
  requestVoiceToken(channelId: string): Promise<VoiceTokenResponse>
}

type VoiceStoreApi = Pick<StoreApi<VoiceStore>, 'getState' | 'subscribe'>

/**
 * Entra, troca e sai de canais de voz usando uma única sala do LiveKit,
 * mantendo o microfone de acordo com os botões de mutar/ensurdecer.
 * Exemplo: `await voiceSession.join(api, channel.id)`
 */
export class VoiceSessionController {
  constructor(
    private readonly room: VoiceRoomPort,
    private readonly store: VoiceStoreApi,
  ) {
    room.on(RoomEvent.Disconnected, (reason) => this.handleDisconnected(reason))
    store.subscribe((state, previous) => {
      if (isMicrophoneLive(state) !== isMicrophoneLive(previous)) void this.syncMicrophone()
    })
  }

  async join(tokens: VoiceTokenSource, channelId: string): Promise<void> {
    if (this.store.getState().connection?.channelId === channelId) return
    try {
      const { token, livekitUrl } = await tokens.requestVoiceToken(channelId)
      if (this.room.state !== ConnectionState.Disconnected) await this.room.disconnect()
      await this.room.connect(livekitUrl, token)
      this.store.getState().join({ channelId, token, livekitUrl })
      await this.syncMicrophone()
    } catch (error) {
      this.store.getState().leave(`Não foi possível entrar na call: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async leave(): Promise<void> {
    this.store.getState().leave()
    await this.room.disconnect()
  }

  private handleDisconnected(reason: DisconnectReason | undefined): void {
    const message = describeVoiceDisconnect(reason)
    if (message) this.store.getState().leave(message)
  }

  private async syncMicrophone(): Promise<void> {
    const state = this.store.getState()
    if (!state.connection) return
    await this.room.localParticipant.setMicrophoneEnabled(isMicrophoneLive(state), MICROPHONE_OPTIONS)
  }
}
