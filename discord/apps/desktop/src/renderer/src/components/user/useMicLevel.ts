import { useEffect, useRef, useState } from 'react'
import { Track } from 'livekit-client'
import { captureOptions, type MicPreferences } from '../../lib/voice/micPreferences'
import { micLevelPercent } from '../../lib/voice/micLevel'
import { rmsLevel } from '../../lib/voice/speakingLevel'
import { voiceRoom } from '../../lib/voice/voiceSession'

const METER_MS = 32

/**
 * Porcentagem da barra de nível. Na chamada mede a faixa já publicada;
 * fora dela abre um microfone só para a barra.
 * Exemplo: `const level = useMicLevel(prefs, inCall)`
 */
export function useMicLevel(prefs: MicPreferences, inCall: boolean): number {
  const [percent, setPercent] = useState(0)
  const gainRef = useRef(prefs.inputGain)
  gainRef.current = prefs.inputGain

  useEffect(() => {
    return watchLevel(prefs, inCall, gainRef, setPercent)
  }, [prefs.deviceId, prefs.noiseSuppression, prefs.echoCancellation, prefs.autoGainControl, inCall])

  return percent
}

function watchLevel(
  prefs: MicPreferences,
  inCall: boolean,
  gainRef: { current: number },
  setPercent: (percent: number) => void,
): () => void {
  let closed = false
  let tap: LevelTap | undefined
  void openMicTap(prefs, inCall).then((opened) => {
    if (closed) opened.close()
    else tap = opened
  }).catch(() => setPercent(0))
  const timer = window.setInterval(() => {
    if (!tap) return
    tap.setPreviewGain(gainRef.current)
    const next = micLevelPercent(tap.readLevel())
    setPercent(next)
  }, METER_MS)
  return () => {
    closed = true
    window.clearInterval(timer)
    tap?.close()
  }
}

async function openMicTap(prefs: MicPreferences, inCall: boolean): Promise<LevelTap> {
  const published = inCall ? publishedMicTrack() : undefined
  if (published) return tapTrack(published, false)
  return tapPreview(prefs)
}

function publishedMicTrack(): MediaStreamTrack | undefined {
  const publication = voiceRoom.localParticipant.getTrackPublication(Track.Source.Microphone)
  const track = publication?.track?.mediaStreamTrack
  if (!track || track.readyState !== 'live' || publication?.isMuted) return undefined
  return track
}

async function tapPreview(prefs: MicPreferences): Promise<LevelTap> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: previewConstraints(prefs) })
  const track = stream.getAudioTracks()[0]
  if (!track) {
    stream.getTracks().forEach((item) => item.stop())
    throw new Error('getUserMedia devolveu stream sem faixa de áudio; esperado um microfone')
  }
  return tapTrack(track, true)
}

function previewConstraints(prefs: MicPreferences): MediaTrackConstraints {
  const options = captureOptions(prefs)
  const deviceId = options.deviceId === 'default' ? undefined : { exact: String(options.deviceId) }
  return {
    deviceId,
    noiseSuppression: options.noiseSuppression,
    echoCancellation: options.echoCancellation,
    autoGainControl: options.autoGainControl,
  }
}

function tapTrack(track: MediaStreamTrack, ownsTrack: boolean): LevelTap {
  const context = new AudioContext()
  const source = context.createMediaStreamSource(new MediaStream([track]))
  const gain = context.createGain()
  const analyser = context.createAnalyser()
  analyser.fftSize = 512
  wireTap(source, gain, analyser, ownsTrack)
  void context.resume()
  const samples = new Uint8Array(analyser.fftSize)
  return {
    readLevel: () => {
      analyser.getByteTimeDomainData(samples)
      return rmsLevel(samples)
    },
    setPreviewGain: (value) => {
      if (ownsTrack) gain.gain.value = value
    },
    close: () => {
      source.disconnect()
      void context.close()
      if (ownsTrack) track.stop()
    },
  }
}

function wireTap(source: MediaStreamAudioSourceNode, gain: GainNode, analyser: AnalyserNode, preview: boolean): void {
  if (!preview) {
    source.connect(analyser)
    return
  }
  source.connect(gain)
  gain.connect(analyser)
}

interface LevelTap {
  readLevel: () => number
  setPreviewGain: (value: number) => void
  close: () => void
}
