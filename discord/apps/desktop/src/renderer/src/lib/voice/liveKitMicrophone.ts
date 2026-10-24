import { Track, type AudioCaptureOptions, type AudioProcessorOptions, type LocalAudioTrack, type Room, type TrackProcessor } from 'livekit-client'
import type { CaptureProbe } from './earStatus'
import { microphonePublishOptions } from './micPreferences'

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
    setEnabled: (enabled, options) => publishMicrophone(room, enabled, options),
    restart: (options) => restartMicrophone(room, options, withGain),
    attachGain: (processor) => attachGainOnce(room, processor, withGain),
    readCapture: () => readCapture(room),
  }
}

async function restartMicrophone(
  room: Room,
  options: AudioCaptureOptions,
  withGain: WeakSet<LocalAudioTrack>,
): Promise<void> {
  const track = microphoneTrack(room)
  if (!track) return publishMicrophone(room, true, options)
  await releaseGate(track, withGain)
  await track.restartTrack(options)
}

async function releaseGate(track: LocalAudioTrack, withGain: WeakSet<LocalAudioTrack>): Promise<void> {
  // O portão segura o dispositivo. Sem soltar, o Windows ignora o eco desligado.
  await track.stopProcessor()
  withGain.delete(track)
}

function publishMicrophone(room: Room, enabled: boolean, options: AudioCaptureOptions): Promise<void> {
  // O terceiro argumento é o preset. Sem ele o LiveKit publica a voz a 48 kbps.
  return room.localParticipant
    .setMicrophoneEnabled(enabled, options, microphonePublishOptions())
    .then(() => undefined)
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
