import { beforeEach, describe, expect, it } from 'vitest'
import { ConnectionState, Track, type AudioCaptureOptions, type Room, type TrackPublishOptions } from 'livekit-client'
import { useMicPrefsStore } from '../../stores/micPrefsStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { liveKitMicrophone } from './liveKitMicrophone'
import { captureOptions, DEFAULT_MIC_PREFERENCES, microphonePublishOptions } from './micPreferences'
import { VoiceSessionController, type VoiceRoomPort } from './voiceSessionController'

interface PublishedTrack {
  kind: string
  restarts: AudioCaptureOptions[]
  processors: number
  stops: number
  settings: MediaTrackSettings & { voiceIsolation?: boolean }
  restartTrack(options: AudioCaptureOptions): Promise<void>
  stopProcessor(): Promise<void>
  setProcessor(): Promise<void>
  getSourceTrackSettings(): MediaTrackSettings
}

describe('microfone publicado', () => {
  beforeEach(resetVoice)

  it('publica com o preset de voz e republica exatamente as opções recebidas', async () => {
    const track = publishedTrack()
    const room = fakeRoom(track)
    const mic = liveKitMicrophone(room.room)
    const options = captureOptions(DEFAULT_MIC_PREFERENCES)

    await mic.setEnabled(true, options)
    await mic.restart(options)

    expect(room.publishes[0]).toEqual({ enabled: true, options, preset: microphonePublishOptions() })
    expect(track.stops).toBe(1)
    expect(track.restarts).toEqual([options])
    expect(options.echoCancellation, 'o eco da preferência não vira exact false').toBe(true)
  })

  it('liga o portão uma vez e ignora texto no getSettings', async () => {
    const track = publishedTrack()
    track.settings.voiceIsolation = 'ligado' as unknown as boolean
    const room = fakeRoom(track)
    const mic = liveKitMicrophone(room.room)
    const processor = {} as Parameters<ReturnType<typeof liveKitMicrophone>['attachGain']>[0]

    await mic.attachGain(processor)
    await mic.attachGain(processor)

    expect(track.processors).toBe(1)
    expect(mic.readCapture()).toEqual({ echoCancellation: true, voiceIsolation: undefined })
  })

  it('sem faixa, ou com faixa que não é áudio, a leitura volta vazia', () => {
    expect(liveKitMicrophone(fakeRoom(null).room).readCapture()).toEqual({})
    const video = publishedTrack()
    video.kind = 'video'
    expect(liveKitMicrophone(fakeRoom(video).room).readCapture()).toEqual({})
  })

  it('sem faixa publicada, restart pede o microfone em vez de restartTrack', async () => {
    const room = fakeRoom(null)
    await liveKitMicrophone(room.room).restart(captureOptions(DEFAULT_MIC_PREFERENCES))

    expect(room.publishes).toHaveLength(1)
    expect(room.publishes[0]?.enabled).toBe(true)
  })

  it('abrir e fechar o Me ouvir não recaptura a faixa que já está no ar', async () => {
    const track = publishedTrack()
    const room = fakeRoom(track)
    const controller = new VoiceSessionController(roomPort(room.room), useVoiceStore, useMicPrefsStore)
    await controller.join(tokens(), 'canal')
    const publishes = room.publishes.length

    await controller.setSelfMonitor(true)
    await controller.setSelfMonitor(false)

    expect(room.publishes, 'a escuta não chama setMicrophoneEnabled de novo').toHaveLength(publishes)
    expect(track.restarts, 'a escuta não chama restartTrack').toEqual([])
    expect(track.stops, 'a escuta não solta o processador').toBe(0)
    expect(room.publishes[0]?.options.echoCancellation).toBe(true)
    expect(micRead(room.room).echoCancellation).toBe(true)
  })
})

function micRead(room: Room): { echoCancellation?: boolean } {
  return liveKitMicrophone(room).readCapture()
}

function resetVoice(): void {
  useVoiceStore.setState({ connection: null, micMuted: false, deafened: false, micMutedBeforeDeafen: false, lastError: null })
  useMicPrefsStore.setState(DEFAULT_MIC_PREFERENCES)
}

function tokens(): { requestVoiceToken(channelId: string): Promise<{ token: string; livekitUrl: string }> } {
  return { requestVoiceToken: async (channelId) => ({ token: `tok-${channelId}`, livekitUrl: 'ws://host:7880' }) }
}

function publishedTrack(): PublishedTrack {
  const track: PublishedTrack = {
    kind: Track.Kind.Audio,
    restarts: [],
    processors: 0,
    stops: 0,
    settings: { echoCancellation: true, deviceId: 'default', voiceIsolation: false },
    async restartTrack(options) {
      track.restarts.push(options)
    },
    async stopProcessor() {
      track.stops += 1
    },
    async setProcessor() {
      track.processors += 1
    },
    getSourceTrackSettings() {
      return track.settings
    },
  }
  return track
}

function fakeRoom(track: PublishedTrack | null): { room: Room; publishes: PublishCall[] } {
  const publishes: PublishCall[] = []
  const room = {
    localParticipant: {
      async setMicrophoneEnabled(enabled: boolean, options: AudioCaptureOptions, preset: TrackPublishOptions) {
        publishes.push({ enabled, options, preset })
      },
      getTrackPublication(source: Track.Source) {
        if (source !== Track.Source.Microphone || !track) return undefined
        return { track }
      },
    },
  }
  return { room: room as unknown as Room, publishes }
}

interface PublishCall {
  enabled: boolean
  options: AudioCaptureOptions
  preset: TrackPublishOptions
}

function roomPort(room: Room): VoiceRoomPort {
  const state = { value: ConnectionState.Disconnected }
  return {
    get state() {
      return state.value
    },
    microphone: liveKitMicrophone(room),
    async connect() {
      state.value = ConnectionState.Connected
    },
    async disconnect() {
      state.value = ConnectionState.Disconnected
    },
    on() {},
    onParticipant() {},
    onReconnecting() {},
    onReconnected() {},
    remoteIdentities: () => [],
  }
}
