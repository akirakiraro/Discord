import { Room, ScreenSharePresets, type RoomOptions } from 'livekit-client'
import { useVoiceStore } from '../../stores/voiceStore'
import { VoiceSessionController } from './voiceSessionController'

const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: { screenShareEncoding: ScreenSharePresets.h1080fps30.encoding },
}

/** Uma única sala por app: trocar de canal reaproveita a mesma `Room`, como no Discord. */
export const voiceRoom = new Room(ROOM_OPTIONS)
export const voiceSession = new VoiceSessionController(voiceRoom, useVoiceStore)
