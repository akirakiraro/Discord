import { Room, RoomEvent, ScreenSharePresets, type Participant, type RoomOptions } from 'livekit-client'
import { useMicPrefsStore } from '../../stores/micPrefsStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { CallChimeGate } from './callChimeGate'
import { isCallSoundSilenced } from './callChime'
import { callSoundSinkId, CallChimePlayer } from './callChimePlayer'
import { liveKitMicrophone } from './liveKitMicrophone'
import { roomAudioCaptureDefaults } from './micPreferences'
import { VoiceSessionController, type VoiceRoomPort } from './voiceSessionController'

const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  audioCaptureDefaults: roomAudioCaptureDefaults(),
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
  onParticipant: (event, listener) => bindParticipant(event, listener),
  onReconnecting: (listener) => voiceRoom.on(RoomEvent.Reconnecting, listener),
  onReconnected: (listener) => voiceRoom.on(RoomEvent.Reconnected, listener),
  remoteIdentities: () => [...voiceRoom.remoteParticipants.keys()],
}

const callChimes = new CallChimeGate({
  prefs: () => useMicPrefsStore.getState(),
  silenced: () => isCallSoundSilenced(useVoiceStore.getState().deafened),
  sinkId: () => callSoundSinkId(activeOutputDevice(), pageAudioElements()),
  now: () => Date.now(),
  soon: (run) => queueMicrotask(run),
  player: new CallChimePlayer(),
})

export const voiceSession = new VoiceSessionController(sessionRoom, useVoiceStore, useMicPrefsStore, callChimes)

function bindParticipant(event: 'connected' | 'disconnected', listener: (identity: string, participantKind?: string | number) => void): void {
  const name = event === 'connected' ? RoomEvent.ParticipantConnected : RoomEvent.ParticipantDisconnected
  voiceRoom.on(name, (participant: Participant) => listener(participant.identity, participant.kind))
}

function activeOutputDevice(): string | undefined {
  try {
    return voiceRoom.getActiveDevice('audiooutput')
  } catch {
    return undefined
  }
}

function pageAudioElements(): Array<{ sinkId?: string }> {
  if (typeof document === 'undefined') return []
  return [...document.querySelectorAll('audio')]
}
