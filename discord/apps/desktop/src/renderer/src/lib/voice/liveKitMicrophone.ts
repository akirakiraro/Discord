import { Track, type AudioCaptureOptions, type AudioProcessorOptions, type LocalAudioTrack, type Room, type TrackProcessor } from 'livekit-client'
import type { CaptureProbe } from './earStatus'

export interface MicrophonePort {
  setEnabled(enabled: boolean, options: AudioCaptureOptions): Promise<void>
  restart(options: AudioCaptureOptions): Promise<void>
  attachGain(processor: TrackProcessor<Track.Kind.Audio, AudioProcessorOptions>): Promise<void>
  readCapture(): CaptureProbe
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
    restart: (options) => restartMicrophone(room, options, withGain),
    attachGain: (processor) => attachGainOnce(room, processor, withGain),
    readCapture: () => readCapture(room),
  }
}

async function restartMicrophone(room: Room, options: AudioCaptureOptions, withGain: WeakSet<LocalAudioTrack>): Promise<void> {
  const track = microphoneTrack(room)
  if (!track) {
    await room.localParticipant.setMicrophoneEnabled(true, options)
    return
  }
  // O portão segura o dispositivo. Sem soltar, o Windows ignora echoCancellation: false.
  await track.stopProcessor()
  withGain.delete(track)
  await track.restartTrack(options)
}

function readCapture(room: Room): CaptureProbe {
  const track = microphoneTrack(room)
  if (!track) return {}
  const settings = track.getSourceTrackSettings() as MediaTrackSettings & { voiceIsolation?: unknown }
  return { echoCancellation: asBool(settings.echoCancellation), voiceIsolation: asBool(settings.voiceIsolation) }
}

function asBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
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
