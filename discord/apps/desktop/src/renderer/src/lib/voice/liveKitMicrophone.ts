import { Track, type AudioCaptureOptions, type AudioProcessorOptions, type LocalAudioTrack, type Room, type TrackProcessor } from 'livekit-client'

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
    setEnabled: (enabled, options) => room.localParticipant.setMicrophoneEnabled(enabled, options).then(() => undefined),
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
  await room.localParticipant.setMicrophoneEnabled(true, options)
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
