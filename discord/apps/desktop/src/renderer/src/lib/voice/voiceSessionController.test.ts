import { beforeEach, describe, expect, it } from 'vitest'
import { ConnectionState, DisconnectReason, RoomEvent } from 'livekit-client'
import type { VoiceTokenResponse } from '@radcord/shared'
import { useVoiceStore } from '../../stores/voiceStore'
import { VoiceSessionController, type VoiceRoomPort, type VoiceTokenSource } from './voiceSessionController'

class FakeVoiceRoom implements VoiceRoomPort {
  state: ConnectionState = ConnectionState.Disconnected
  readonly log: string[] = []
  failNextConnect = false
  private disconnectedListener: ((reason?: DisconnectReason) => void) | null = null

  readonly localParticipant = {
    setMicrophoneEnabled: async (enabled: boolean): Promise<void> => {
      this.log.push(`mic:${enabled}`)
    },
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
    useVoiceStore.setState({ connection: null, micMuted: false, deafened: false, lastError: null })
    room = new FakeVoiceRoom()
    controller = new VoiceSessionController(room, useVoiceStore)
  })

  it('entra no canal e liga o microfone', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')

    expect(room.log).toEqual(['connect:ws://host:7880:tok-v1', 'mic:true'])
    expect(useVoiceStore.getState().connection?.channelId).toBe('v1')
  })

  it('trocar de canal desconecta antes, sem registrar erro', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')
    await controller.join(new FakeVoiceTokens(), 'v2')

    expect(room.log.slice(2)).toEqual(['disconnect', 'connect:ws://host:7880:tok-v2', 'mic:true'])
    expect(useVoiceStore.getState()).toMatchObject({ connection: { channelId: 'v2' }, lastError: null })
  })

  it('clicar no canal em que já está não reconecta', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')
    await controller.join(new FakeVoiceTokens(), 'v1')

    expect(room.log.filter((entry) => entry.startsWith('connect'))).toHaveLength(1)
  })

  it('mutar e ensurdecer refletem no microfone da call', async () => {
    await controller.join(new FakeVoiceTokens(), 'v1')

    useVoiceStore.getState().toggleMic()
    useVoiceStore.getState().toggleDeafen()
    useVoiceStore.getState().toggleMic()
    await Promise.resolve()

    expect(room.log.slice(2), 'só muda quando o estado efetivo muda').toEqual(['mic:false'])
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
})
