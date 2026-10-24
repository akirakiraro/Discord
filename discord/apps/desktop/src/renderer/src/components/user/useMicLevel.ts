import { useEffect, useRef, useState } from 'react'
import { captureOptions, type MicPreferences } from '../../lib/voice/micPreferences'
import { METER_MIN_DB, rmsToDb } from '../../lib/voice/micLevel'
import { rmsLevel } from '../../lib/voice/speakingLevel'
import { voiceSession } from '../../lib/voice/voiceSession'

const METER_MS = 32

/**
 * Nível em dB depois do volume e antes do portão.
 * Na chamada lê o processador; fora dela abre o microfone só para a barra.
 * Exemplo: `const levelDb = useMicLevel(prefs, inCall)`
 */
export function useMicLevel(prefs: MicPreferences, inCall: boolean): number {
  const [levelDb, setLevelDb] = useState(METER_MIN_DB)
  const gainRef = useRef(prefs.inputGain)
  gainRef.current = prefs.inputGain

  useEffect(() => {
    if (inCall) return pollCallLevel(setLevelDb)
    return pollPreview(prefs, gainRef, setLevelDb)
  }, [prefs.deviceId, prefs.noiseSuppression, prefs.echoCancellation, prefs.autoGainControl, inCall])

  return levelDb
}

function pollCallLevel(setLevelDb: (db: number) => void): () => void {
  const timer = window.setInterval(() => {
    setLevelDb(voiceSession.inputLevelDb() ?? METER_MIN_DB)
  }, METER_MS)
  return () => window.clearInterval(timer)
}

function pollPreview(prefs: MicPreferences, gainRef: { current: number }, setLevelDb: (db: number) => void): () => void {
  let closed = false
  let tap: PreviewTap | undefined
  void openPreview(prefs, gainRef).then((opened) => {
    if (closed) opened.close()
    else tap = opened
  }).catch(() => setLevelDb(METER_MIN_DB))
  const timer = window.setInterval(() => {
    if (tap) setLevelDb(tap.readDb())
  }, METER_MS)
  return () => {
    closed = true
    window.clearInterval(timer)
    tap?.close()
  }
}

async function openPreview(prefs: MicPreferences, gainRef: { current: number }): Promise<PreviewTap> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: previewConstraints(prefs) })
  const track = stream.getAudioTracks()[0]
  if (!track) {
    stream.getTracks().forEach((item) => item.stop())
    throw new Error('getUserMedia devolveu stream sem faixa de áudio; esperado um microfone')
  }
  return tapTrack(track, gainRef)
}

function previewConstraints(prefs: MicPreferences): MediaTrackConstraints {
  const options = captureOptions(prefs)
  const deviceId = options.deviceId === 'default' ? undefined : { exact: String(options.deviceId) }
  return { ...options, deviceId }
}

function tapTrack(track: MediaStreamTrack, gainRef: { current: number }): PreviewTap {
  const context = new AudioContext()
  const source = context.createMediaStreamSource(new MediaStream([track]))
  const gain = context.createGain()
  const analyser = context.createAnalyser()
  analyser.fftSize = 512
  gain.gain.value = gainRef.current
  source.connect(gain)
  gain.connect(analyser)
  void context.resume()
  const samples = new Uint8Array(analyser.fftSize)
  return {
    readDb: () => {
      gain.gain.value = gainRef.current
      analyser.getByteTimeDomainData(samples)
      return rmsToDb(rmsLevel(samples))
    },
    close: () => {
      source.disconnect()
      void context.close()
      track.stop()
    },
  }
}

interface PreviewTap {
  readDb: () => number
  close: () => void
}
