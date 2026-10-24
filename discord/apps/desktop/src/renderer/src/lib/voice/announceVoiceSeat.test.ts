import { beforeEach, describe, expect, it } from 'vitest'
import { useVoiceStore } from '../../stores/voiceStore'
import { bindVoiceAnnouncements, voiceChannelSource, type VoiceSeatSocket } from './announceVoiceSeat'

const CONNECTION = { channelId: 'v1', token: 't', livekitUrl: 'ws://26.186.21.58:7880' }

class FakeSeatSocket implements VoiceSeatSocket {
  connected = false
  readonly sent: string[] = []
  private connectListener: (() => void) | null = null

  emit(event: 'voice:join', payload: { channelId: string }): void
  emit(event: 'voice:leave'): void
  emit(event: 'voice:join' | 'voice:leave', payload?: { channelId: string }): void {
    this.sent.push(payload ? `${event}:${payload.channelId}` : event)
  }

  on(_event: 'connect', listener: () => void): void {
    this.connectListener = listener
  }

  off(_event: 'connect', listener: () => void): void {
    if (this.connectListener === listener) this.connectListener = null
  }

  connect(): void {
    this.connected = true
    this.connectListener?.()
  }
}

describe('bindVoiceAnnouncements', () => {
  let socket: FakeSeatSocket

  beforeEach(() => {
    useVoiceStore.setState({ connection: null, micMuted: false, deafened: false, lastError: null })
    socket = new FakeSeatSocket()
  })

  it('entrar, trocar e sair avisam o host sem repetir no mudo', () => {
    socket.connected = true
    const stop = bindVoiceAnnouncements(socket, voiceChannelSource(useVoiceStore))

    useVoiceStore.getState().join(CONNECTION)
    useVoiceStore.getState().toggleMic()
    useVoiceStore.getState().join({ ...CONNECTION, channelId: 'v2' })
    useVoiceStore.getState().leave()

    expect(socket.sent).toEqual(['voice:join:v1', 'voice:join:v2', 'voice:leave'])
    stop()
  })

  it('com o socket caído guarda o canal e reanuncia quando volta', () => {
    const stop = bindVoiceAnnouncements(socket, voiceChannelSource(useVoiceStore))
    useVoiceStore.getState().join(CONNECTION)

    expect(socket.sent, 'ainda não há socket para avisar').toEqual([])

    socket.connect()
    expect(socket.sent).toEqual(['voice:join:v1'])
    stop()
  })

  it('reconectar no meio da call reanuncia o canal atual', () => {
    socket.connected = true
    const stop = bindVoiceAnnouncements(socket, voiceChannelSource(useVoiceStore))
    useVoiceStore.getState().join(CONNECTION)
    socket.sent.length = 0
    socket.connected = false

    socket.connect()

    expect(socket.sent).toEqual(['voice:join:v1'])
    stop()
  })

  it('conectar sem call não emite saída', () => {
    const stop = bindVoiceAnnouncements(socket, voiceChannelSource(useVoiceStore))

    socket.connect()

    expect(socket.sent).toEqual([])
    stop()
  })

  it('parar de ouvir não anuncia a próxima troca', () => {
    socket.connected = true
    const stop = bindVoiceAnnouncements(socket, voiceChannelSource(useVoiceStore))
    stop()

    useVoiceStore.getState().join(CONNECTION)

    expect(socket.sent).toEqual([])
  })
})
