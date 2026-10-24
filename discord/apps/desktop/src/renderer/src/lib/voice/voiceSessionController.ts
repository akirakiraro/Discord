import { ConnectionState, RoomEvent, type AudioCaptureOptions, type DisconnectReason } from 'livekit-client'
import type { StoreApi } from 'zustand'
import type { VoiceTokenResponse } from '@radcord/shared'
import { isMicrophoneLive, type VoiceStore } from '../../stores/voiceStore'
import type { MicPrefsStore } from '../../stores/micPrefsStore'
import { describeVoiceDisconnect } from './describeVoiceDisconnect'
import { SensitivityGate } from './sensitivityGate'
import { monitorCapture, type MicPreferences } from './micPreferences'
import type { MicrophonePort } from './liveKitMicrophone'
import { reportAppError } from '../report/reportAppError'
import { earCaptureFailure } from './earStatus'

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
  private readonly gate: SensitivityGate
  private monitoring = false

  constructor(
    private readonly room: VoiceRoomPort,
    private readonly store: VoiceStoreApi,
    private readonly prefs: MicPrefsApi,
  ) {
    this.gate = new SensitivityGate(
      () => this.prefs.getState().gateDb,
      () => this.prefs.getState().inputGain,
    )
    room.on(RoomEvent.Disconnected, (reason) => this.handleDisconnected(reason))
    store.subscribe((state, previous) => {
      if (isMicrophoneLive(state) !== isMicrophoneLive(previous)) void this.syncMicrophone()
    })
    prefs.subscribe((state, previous) => this.onPrefsChange(state, previous))
  }

  async join(tokens: VoiceTokenSource, channelId: string): Promise<void> {
    if (this.store.getState().connection?.channelId === channelId) return
    try {
      await this.enterChannel(tokens, channelId)
    } catch (error) {
      this.failJoin(error, undefined)
    }
  }

  async leave(): Promise<void> {
    this.monitoring = false
    this.store.getState().leave()
    await this.room.disconnect()
  }

  /**
   * Liga a escuta da própria voz e tira o eco enquanto ela durar.
   * Sem isso o Chromium apaga o áudio que volta do servidor.
   * Republica mesmo com o eco já desligado: o isolamento de voz do SDK também apaga.
   * Exemplo: `await controller.setSelfMonitor(true)`.
   */
  async setSelfMonitor(on: boolean): Promise<void> {
    this.monitoring = on
    await this.republishCapture()
    if (!on) return
    const blocked = earCaptureFailure(this.room.microphone.readCapture())
    if (blocked) throw blocked
  }

  private async enterChannel(tokens: VoiceTokenSource, channelId: string): Promise<void> {
    const { token, livekitUrl } = await tokens.requestVoiceToken(channelId)
    if (this.room.state !== ConnectionState.Disconnected) await this.room.disconnect()
    try {
      await this.room.connect(livekitUrl, token)
    } catch (error) {
      this.failJoin(error, livekitUrl)
      return
    }
    this.store.getState().join({ channelId, token, livekitUrl })
    await this.syncMicrophone()
  }

  private failJoin(error: unknown, livekitUrl: string | undefined): void {
    const message = error instanceof Error ? error.message : String(error)
    const shown = `Não foi possível entrar na call: ${message}`
    reportAppError(shown, livekitUrl)
    this.store.getState().leave(shown)
  }

  private handleDisconnected(reason: DisconnectReason | undefined): void {
    const message = describeVoiceDisconnect(reason)
    if (!message) return
    reportAppError(message)
    this.store.getState().leave(message)
  }

  /** Nível em dB antes do portão, só enquanto o microfone da chamada está ligado. */
  inputLevelDb(): number | undefined {
    if (!this.gate.listening) return undefined
    return this.gate.levelDb
  }

  private onPrefsChange(state: MicPreferences, previous: MicPreferences): void {
    if (state.gateDb !== previous.gateDb) this.gate.setThreshold(state.gateDb)
    if (state.inputGain !== previous.inputGain) this.gate.setVolume(state.inputGain)
    const captureChanged =
      state.deviceId !== previous.deviceId ||
      state.noiseSuppression !== previous.noiseSuppression ||
      state.echoCancellation !== previous.echoCancellation ||
      state.autoGainControl !== previous.autoGainControl
    if (captureChanged) void this.republishCapture()
  }

  private async republishCapture(): Promise<void> {
    const state = this.store.getState()
    if (!state.connection || !isMicrophoneLive(state)) return
    await this.room.microphone.restart(this.captureNow())
    await this.room.microphone.attachGain(this.gate)
  }

  private async syncMicrophone(): Promise<void> {
    const state = this.store.getState()
    if (!state.connection) return
    const live = isMicrophoneLive(state)
    await this.room.microphone.setEnabled(live, this.captureNow())
    if (live) await this.room.microphone.attachGain(this.gate)
  }

  private captureNow(): AudioCaptureOptions {
    return monitorCapture(this.prefs.getState(), this.monitoring)
  }
}
