import { ConnectionState, RoomEvent, type DisconnectReason } from 'livekit-client'
import type { StoreApi } from 'zustand'
import type { VoiceTokenResponse } from '@radcord/shared'
import { isMicrophoneLive, type VoiceStore } from '../../stores/voiceStore'
import type { MicPrefsStore } from '../../stores/micPrefsStore'
import { describeVoiceDisconnect } from './describeVoiceDisconnect'
import { InputGainProcessor } from './inputGainProcessor'
import { captureOptions, type MicPreferences } from './micPreferences'
import type { MicrophonePort } from './liveKitMicrophone'

/** O pedaço da `Room` do LiveKit que o controlador usa (permite um fake nos testes). */
export interface VoiceRoomPort {
  readonly state: ConnectionState
  readonly microphone: MicrophonePort
  connect(url: string, token: string): Promise<void>
  disconnect(): Promise<void>
  on(event: RoomEvent.Disconnected, listener: (reason?: DisconnectReason) => void): unknown
}

export interface VoiceTokenSource {
  requestVoiceToken(channelId: string): Promise<VoiceTokenResponse>
}

type VoiceStoreApi = Pick<StoreApi<VoiceStore>, 'getState' | 'subscribe'>
type MicPrefsApi = Pick<StoreApi<MicPrefsStore>, 'getState' | 'subscribe'>

/**
 * Entra, troca e sai de canais de voz usando uma única sala do LiveKit,
 * mantendo o microfone de acordo com os botões de mutar/ensurdecer e as preferências locais.
 * Exemplo: `await voiceSession.join(api, channel.id)`
 */
export class VoiceSessionController {
  private readonly gainProcessor: InputGainProcessor

  constructor(
    private readonly room: VoiceRoomPort,
    private readonly store: VoiceStoreApi,
    private readonly prefs: MicPrefsApi,
  ) {
    this.gainProcessor = new InputGainProcessor(() => this.prefs.getState().inputGain)
    room.on(RoomEvent.Disconnected, (reason) => this.handleDisconnected(reason))
    store.subscribe((state, previous) => {
      if (isMicrophoneLive(state) !== isMicrophoneLive(previous)) void this.syncMicrophone()
    })
    prefs.subscribe((state, previous) => this.onPrefsChange(state, previous))
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
      const message = error instanceof Error ? error.message : String(error)
      this.store.getState().leave(`Não foi possível entrar na call: ${message}`)
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

  private onPrefsChange(state: MicPreferences, previous: MicPreferences): void {
    if (state.inputGain !== previous.inputGain) this.gainProcessor.setGain(state.inputGain)
    const captureChanged = state.deviceId !== previous.deviceId || state.noiseSuppression !== previous.noiseSuppression
    if (captureChanged) void this.republishCapture()
  }

  private async republishCapture(): Promise<void> {
    const state = this.store.getState()
    if (!state.connection || !isMicrophoneLive(state)) return
    await this.room.microphone.restart(captureOptions(this.prefs.getState()))
  }

  private async syncMicrophone(): Promise<void> {
    const state = this.store.getState()
    if (!state.connection) return
    const live = isMicrophoneLive(state)
    await this.room.microphone.setEnabled(live, captureOptions(this.prefs.getState()))
    if (live) await this.room.microphone.attachGain(this.gainProcessor)
  }
}
