import { useEffect, useState } from 'react'
import { ParticipantEvent, Track, type Participant } from 'livekit-client'
import { rmsLevel, SILENT_SPEAK_STATE, stepSpeaking, type SpeakState } from '../../lib/voice/speakingLevel'

const METER_MS = 32

/**
 * Anel verde lido no microfone local, sem esperar o servidor de voz.
 * Quem está longe continua no evento do LiveKit.
 * Exemplo: `const speaking = useSpeaking(participant)`
 */
export function useSpeaking(participant: Participant): boolean {
  const [localSpeaking, setLocalSpeaking] = useState(false)
  const [remoteSpeaking, setRemoteSpeaking] = useState(participant.isSpeaking)

  useEffect(() => {
    if (!participant.isLocal) return undefined
    return watchMicrophone(participant, setLocalSpeaking)
  }, [participant])

  useEffect(() => {
    if (participant.isLocal) return undefined
    setRemoteSpeaking(participant.isSpeaking)
    const onSpeaking = (speaking: boolean) => setRemoteSpeaking(speaking)
    participant.on(ParticipantEvent.IsSpeakingChanged, onSpeaking)
    return () => {
      participant.off(ParticipantEvent.IsSpeakingChanged, onSpeaking)
    }
  }, [participant])

  return participant.isLocal ? localSpeaking : remoteSpeaking
}

function watchMicrophone(participant: Participant, setSpeaking: (speaking: boolean) => void): () => void {
  let stopMeter = () => {}
  const attach = () => {
    stopMeter()
    stopMeter = startMeter(microphoneTrack(participant), setSpeaking)
  }
  attach()
  participant.on(ParticipantEvent.TrackPublished, attach)
  participant.on(ParticipantEvent.TrackUnpublished, attach)
  participant.on(ParticipantEvent.TrackMuted, attach)
  participant.on(ParticipantEvent.TrackUnmuted, attach)
  return () => {
    stopMeter()
    participant.off(ParticipantEvent.TrackPublished, attach)
    participant.off(ParticipantEvent.TrackUnpublished, attach)
    participant.off(ParticipantEvent.TrackMuted, attach)
    participant.off(ParticipantEvent.TrackUnmuted, attach)
  }
}

function startMeter(track: MediaStreamTrack | undefined, setSpeaking: (speaking: boolean) => void): () => void {
  if (!track) {
    setSpeaking(false)
    return () => {}
  }
  const meter = openMeter(track)
  let state: SpeakState = SILENT_SPEAK_STATE
  const timer = window.setInterval(() => {
    state = publishLevel(state, meter.readLevel(), setSpeaking)
  }, METER_MS)
  return () => closeMeter(timer, meter, setSpeaking)
}

function openMeter(track: MediaStreamTrack): LevelMeter {
  const context = new AudioContext()
  const source = context.createMediaStreamSource(new MediaStream([track]))
  const analyser = context.createAnalyser()
  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.2
  source.connect(analyser)
  void context.resume()
  const samples = new Uint8Array(analyser.fftSize)
  return {
    readLevel: () => {
      analyser.getByteTimeDomainData(samples)
      return rmsLevel(samples)
    },
    close: () => {
      source.disconnect()
      void context.close()
    },
  }
}

function publishLevel(state: SpeakState, level: number, setSpeaking: (speaking: boolean) => void): SpeakState {
  const next = stepSpeaking(state, level, METER_MS)
  if (next.speaking !== state.speaking) setSpeaking(next.speaking)
  return next
}

function closeMeter(timer: number, meter: LevelMeter, setSpeaking: (speaking: boolean) => void): void {
  window.clearInterval(timer)
  meter.close()
  setSpeaking(false)
}

interface LevelMeter {
  readLevel: () => number
  close: () => void
}

function microphoneTrack(participant: Participant): MediaStreamTrack | undefined {
  const publication = participant.getTrackPublication(Track.Source.Microphone)
  if (!publication || publication.isMuted || !participant.isMicrophoneEnabled) return undefined
  const track = publication.track?.mediaStreamTrack
  if (!track || track.readyState !== 'live') return undefined
  return track
}
