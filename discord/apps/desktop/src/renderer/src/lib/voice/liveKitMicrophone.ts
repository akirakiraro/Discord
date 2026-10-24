import { Track, type AudioCaptureOptions, type AudioProcessorOptions, type LocalAudioTrack, type Room, type TrackProcessor } from 'livekit-client'
import { microphonePublishOptions } from './micPreferences'

export interface MicrophonePort {
  setEnabled(enabled: boolean, options: AudioCaptureOptions): Promise<void>
  restart(options: AudioCaptureOptions): Promise<void>
  attachGain(processor: TrackProcessor<Track.Kind.Audio, AudioProcessorOptions>): Promise<void>
}

/**
 * Adapta a `Room` do LiveKit para trocar o microfone e ligar o portão
 * sem o controlador depender da sala inteira.
 * Exemplo: `liveKitMicrophone(voiceRoom)`
 */
export function liveKitMicrophone(room: Room): MicrophonePort {
  const withGain = new WeakSet<LocalAudioTrack>()
  return {
    setEnabled: (enabled, options) => publishMicrophone(room, enabled, options),
    restart: (options) => restartMicrophone(room, options),
    attachGain: (processor) => attachGainOnce(room, processor, withGain),
  }
}

async function restartMicrophone(room: Room, options: AudioCaptureOptions): Promise<void> {
  const track = microphoneTrack(room)
  if (track) {
    await track.restartTrack(options)
    return
  }
  await publishMicrophone(room, true, options)
}

function publishMicrophone(room: Room, enabled: boolean, options: AudioCaptureOptions): Promise<void> {
  // O terceiro argumento é o preset. Sem ele o LiveKit publica a voz a 48 kbps.
  return room.localParticipant
    .setMicrophoneEnabled(enabled, options, microphonePublishOptions())
    .then(() => undefined)
}

async function attachGainOnce(
  room: Room,
  processor: TrackProcessor<Track.Kind.Audio, AudioProcessorOptions>,
  withGain: WeakSet<LocalAudioTrack>,
): Promise<void> {
  const track = microphoneTrack(room)
  if (!track || withGain.has(track)) return
  await track.setProcessor(processor)
  withGain.add(track)
}

function microphoneTrack(room: Room): LocalAudioTrack | undefined {
  const track = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
  // A publicação devolve LocalTrack; `kind` não estreita para LocalAudioTrack.
  if (!track || track.kind !== Track.Kind.Audio) return undefined
  return track as LocalAudioTrack
}
