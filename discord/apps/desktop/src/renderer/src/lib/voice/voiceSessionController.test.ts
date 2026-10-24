import { beforeEach, describe, expect, it } from 'vitest'
import { ConnectionState, DisconnectReason, RoomEvent, type AudioCaptureOptions, type AudioProcessorOptions, type TrackProcessor, Track } from 'livekit-client'
import type { VoiceTokenResponse } from '@radcord/shared'
import { useMicPrefsStore } from '../../stores/micPrefsStore'
import { useVoiceStore } from '../../stores/voiceStore'
import type { CaptureProbe } from './earStatus'
import type { SensitivityGate } from './sensitivityGate'
import type { CallChimeGatePort } from './callChimeGate'
import { VoiceSessionController, type VoiceRoomPort, type VoiceTokenSource } from './voiceSessionController'
import type { MicrophonePort } from './liveKitMicrophone'

class FakeMicrophone implements MicrophonePort {
  readonly log: string[] = []
  processor: SensitivityGate | null = null
  lastRestart: AudioCaptureOptions | null = null
  probe: CaptureProbe = { echoCancellation: false, voiceIsolation: false }

  async setEnabled(enabled: boolean, _options: AudioCaptureOptions): Promise<void> {
    this.log.push(`mic:${enabled}`)
  }

  async restart(options: AudioCaptureOptions): Promise<void> {
    this.lastRestart = options
    this.log.push(`restart:${String(options.deviceId)}:${captureFlag(options.noiseSuppression)}`)
  }

  async attachGain(processor: TrackProcessor<Track.Kind.Audio, AudioProcessorOptions>): Promise<void> {
    this.processor = processor as SensitivityGate
    this.log.push('gain')
  }

  readCapture(): CaptureProbe {
    return this.probe
  }
}

function captureFlag(value: AudioCaptureOptions['noiseSuppression']): string {
  if (value === true) return 'true'
  if (value === false || (typeof value === 'object' && value.exact === false)) return 'false'
  return 'other'
}

class RecordingChimes implements CallChimeGatePort {
  readonly log: string[] = []

  prime(): void {
    this.log.push('prime')
  }

  onJoined(identities: readonly string[]): void {
    this.log.push(`joined:${identities.join('+')}`)
  }

  onLeft(): void {
    this.log.push('left')
  }

  onRemote(kind: 'join' | 'leave', identity: string, participantKind?: string | number): void {
    this.log.push(`${kind}:${identity}:${String(participantKind ?? '')}`)
  }

  holdReconnect(): void {
    this.log.push('hold')
  }

  releaseReconnect(identities: readonly string[]): void {
    this.log.push(`release:${identities.join('+')}`)
  }
}

class FakeVoiceRoom implements VoiceRoomPort {
  state: ConnectionState = ConnectionState.Disconnected
  readonly microphone = new FakeMicrophone()
  failNextConnect = false
  remotes: string[] = []
  private disconnectedListener: ((reason?: DisconnectReason) => void) | null = null
  private readonly participants: Record<'connected' | 'disconnected', Array<(identity: string, participantKind?: string | number) => void>> = {
    connected: [],
    disconnected: [],
  }
  private reconnecting: Array<() => void> = []
  private reconnected: Array<() => void> = []

  get log(): string[] {
    return this.microphone.log
  }

  async connect(url: string, token: string): Promise<void> {
    if (this.failNextConnect) throw new Error('connection refused')
    this.log.push(`connect:${url}:${token}`)
    this.state = ConnectionState.Connected
  }

  async disconnect(): Promise<void> {
    this.log.push('disconnect')
    this.state = ConnectionState.Disconnected
    this.disconnectedListener?.(DisconnectReason.CLIENT_INITIATED)
  }

  on(_event: RoomEvent.Disconnected, listener: (reason?: DisconnectReason) => void): void {
    this.disconnectedListener = listener
  }

  onParticipant(event: 'connected' | 'disconnected', listener: (identity: string, participantKind?: string | number) => void): void {
    this.participants[event].push(listener)
  }

  onReconnecting(listener: () => void): void {
    this.reconnecting.push(listener)
  }

  onReconnected(listener: () => void): void {
    this.reconnected.push(listener)
  }

  remoteIdentities(): readonly string[] {
    return this.remotes
  }

  emitParticipant(event: 'connected' | 'disconnected', identity: string, participantKind?: string | number): void {
    for (const listener of this.participants[event]) listener(identity, participantKind)
  }

  emitReconnecting(): void {
    for (const listener of this.reconnecting) listener()
  }

  emitReconnected(): void {
    for (const listener of this.reconnected) listener()
  }

  dropFromServer(reason: DisconnectReason): void {
    this.state = ConnectionState.Disconnected
    this.disconnectedListener?.(reason)
  }
}

class FakeVoiceTokens implements VoiceTokenSource {
  async requestVoiceToken(channelId: string): Promise<VoiceTokenResponse> {
    return { token: `tok-${channelId}`, livekitUrl: 'ws://host:7880' }
  }
}

describe('VoiceSessionController', () => {
  let room: FakeVoiceRoom
  let controller: VoiceSessionController

  beforeEach(() => {
    useVoiceStore.setState({ connection: null, micMuted: false, deafened: false, micMutedBeforeDeafen: false, lastError: null })
    useMicPrefsStore.setState({ deviceId: 'default', noiseSuppression: true, gateDb: -45 })
    room = new FakeVoiceRoom()
    controller = new VoiceSessionController(room, useVoiceStore, useMicPrefsStore)
  })

  it('entra no canal e liga o microfone', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')

    expect(room.log).toEqual(['connect:ws://host:7880:tok-v1', 'mic:true', 'gain'])
    expect(useVoiceStore.getState().connection?.channelId).toBe('v1')
  })

  it('trocar de canal desconecta antes, sem registrar erro', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')
    await controller.join(new FakeVoiceTokens(), 'v2')

    expect(room.log.slice(3)).toEqual(['disconnect', 'connect:ws://host:7880:tok-v2', 'mic:true', 'gain'])
    expect(useVoiceStore.getState()).toMatchObject({ connection: { channelId: 'v2' }, lastError: null })
  })

  it('clicar no canal em que já está não reconecta', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')
    await controller.join(new FakeVoiceTokens(), 'v1')

    expect(room.log.filter((entry) => entry.startsWith('connect'))).toHaveLength(1)
  })

  it('mutar enquanto surdo republica o microfone e o áudio volta junto', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')

    useVoiceStore.getState().toggleMic()
    useVoiceStore.getState().toggleDeafen()
    useVoiceStore.getState().toggleMic()
    await Promise.resolve()

    expect(room.log.slice(3), 'o clique no microfone surdo desmuta os dois').toEqual(['mic:false', 'mic:true', 'gain'])
    expect(useVoiceStore.getState()).toMatchObject({ micMuted: false, deafened: false })
  })

  it('desensurdecer devolve o mute anterior e não reabre o microfone', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')
    useVoiceStore.getState().toggleMic()
    await Promise.resolve()

    useVoiceStore.getState().toggleDeafen()
    useVoiceStore.getState().toggleDeafen()
    await Promise.resolve()

    expect(room.log.filter((entry) => entry.startsWith('mic'))).toEqual(['mic:true', 'mic:false'])
    expect(useVoiceStore.getState()).toMatchObject({ micMuted: true, deafened: false })
  })

  it('surdo não republica o microfone ao trocar a entrada', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')
    useVoiceStore.getState().toggleDeafen()
    await Promise.resolve()

    useMicPrefsStore.getState().setDeviceId('headset')
    await Promise.resolve()

    expect(room.log.filter((entry) => entry.startsWith('restart'))).toEqual([])
  })

  it('queda pelo servidor registra o motivo', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')

    room.dropFromServer(DisconnectReason.DUPLICATE_IDENTITY)

    expect(useVoiceStore.getState()).toMatchObject({ connection: null, lastError: expect.stringMatching(/outro dispositivo/) })
  })

  it('falha ao conectar vira erro legível em vez de exceção', async () => {
    room.failNextConnect = true

    await controller.join(new FakeVoiceTokens(), 'v1')

    expect(useVoiceStore.getState().lastError).toMatch(/connection refused/)
  })

  it('sair desconecta sem mensagem de erro', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')

    await controller.leave()

    expect(useVoiceStore.getState()).toMatchObject({ connection: null, lastError: null })
  })

  it('com a call aberta, troca o microfone e a supressão republicando a captura', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')

    useMicPrefsStore.getState().setDeviceId('headset')
    useMicPrefsStore.getState().setNoiseSuppression(false)
    await Promise.resolve()

    expect(room.log.slice(3)).toEqual(['restart:headset:true', 'restart:headset:false', 'gain', 'gain'])
  })

  it('com a call fechada, a preferência fica salva e o microfone não é republicado', async () => {
    useMicPrefsStore.getState().setDeviceId('headset')
    await Promise.resolve()

    expect(room.log).toEqual([])
    expect(useMicPrefsStore.getState().deviceId).toBe('headset')
  })

  it('sensibilidade só move o portão, sem recapturar', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')

    useMicPrefsStore.getState().setGateDb(-30)
    await Promise.resolve()

    expect(room.log.filter((entry) => entry.startsWith('restart'))).toEqual([])
    expect(room.microphone.processor?.thresholdDb).toBe(-30)
  })

  it('se ouvir tira o cancelamento de eco e devolve ao soltar', async () => {
    useMicPrefsStore.setState({ echoCancellation: true })
    await controller.join(new FakeVoiceTokens(), 'v1')

    await controller.setSelfMonitor(true)
    expect(room.microphone.lastRestart?.echoCancellation, 'eco pausado para o retorno não ser apagado').toEqual({ exact: false })
    expect(room.microphone.lastRestart?.voiceIsolation, 'isolamento pausado enquanto se ouve').toEqual({ exact: false })

    await controller.setSelfMonitor(false)
    expect(room.microphone.lastRestart?.echoCancellation, 'eco volta ao soltar').toBe(true)
    expect(room.microphone.lastRestart?.voiceIsolation, 'isolamento continua desligado fora da escuta').toEqual({ exact: false })
  })

  it('escuta republica mesmo com o eco já desligado', async () => {
    useMicPrefsStore.setState({ echoCancellation: false })
    await controller.join(new FakeVoiceTokens(), 'v1')

    await controller.setSelfMonitor(true)

    expect(room.microphone.lastRestart).toMatchObject({
      echoCancellation: { exact: false },
      voiceIsolation: { exact: false },
    })
  })

  it('recusa a escuta se o Chromium mantém o eco ligado', async () => {
    useMicPrefsStore.setState({ echoCancellation: true })
    await controller.join(new FakeVoiceTokens(), 'v1')
    room.microphone.probe = { echoCancellation: true }

    await expect(controller.setSelfMonitor(true)).rejects.toThrow(/cancelamento de eco/)
  })

  it('entrar, trocar e sair avisam o sino com quem já está na sala', async () => {
    const chimes = new RecordingChimes()
    room.remotes = ['ana', 'eu:monitor']
    const session = new VoiceSessionController(room, useVoiceStore, useMicPrefsStore, chimes)

    await session.join(new FakeVoiceTokens(), 'v1')
    room.emitParticipant('connected', 'bia', 0)
    room.emitReconnecting()
    room.remotes = ['ana']
    room.emitReconnected()
    await session.join(new FakeVoiceTokens(), 'v2')
    await session.leave()

    expect(chimes.log, 'a própria troca de canal sai de um e entra no outro').toEqual([
      'prime',
      'joined:ana+eu:monitor',
      'join:bia:0',
      'hold',
      'release:ana',
      'prime',
      'left',
      'joined:ana',
      'prime',
      'left',
    ])
  })

  it('queda da call toca a saída uma vez', async () => {
    const chimes = new RecordingChimes()
    const session = new VoiceSessionController(room, useVoiceStore, useMicPrefsStore, chimes)
    await session.join(new FakeVoiceTokens(), 'v1')

    room.dropFromServer(DisconnectReason.SERVER_SHUTDOWN)

    expect(chimes.log).toEqual(['prime', 'joined:', 'left'])
  })

  it('microfone mutado não republica ao trocar a entrada', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')
    useVoiceStore.getState().toggleMic()
    await Promise.resolve()

    useMicPrefsStore.getState().setDeviceId('headset')
    await Promise.resolve()

    expect(room.log.filter((entry) => entry.startsWith('restart'))).toEqual([])
  })
})
