import { Room, ScreenSharePresets, type RoomOptions } from 'livekit-client'
import { useMicPrefsStore } from '../../stores/micPrefsStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { liveKitMicrophone } from './liveKitMicrophone'
import { VoiceSessionController, type VoiceRoomPort } from './voiceSessionController'

const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: { screenShareEncoding: ScreenSharePresets.h1080fps30.encoding },
}

/** Uma única sala por app: trocar de canal reaproveita a mesma `Room`, como no Discord. */
export const voiceRoom = new Room(ROOM_OPTIONS)

const sessionRoom: VoiceRoomPort = {
  get state() {
    return voiceRoom.state
  },
  microphone: liveKitMicrophone(voiceRoom),
  connect: (url, token) => voiceRoom.connect(url, token),
  disconnect: () => voiceRoom.disconnect(),
  on: (event, listener) => voiceRoom.on(event, listener),
}

export const voiceSession = new VoiceSessionController(sessionRoom, useVoiceStore, useMicPrefsStore)
