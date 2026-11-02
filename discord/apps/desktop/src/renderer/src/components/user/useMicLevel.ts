import { useEffect, useRef, useState } from 'react'
import { captureOptions, type MicPreferences } from '../../lib/voice/micPreferences'
import { createMicChain, followLeveler, readChainRms, setSliderGain, type MicChain } from '../../lib/voice/micGain'
import { METER_MIN_DB, rmsToDb } from '../../lib/voice/micLevel'
import { voiceSession } from '../../lib/voice/voiceSession'

const METER_MS = 32

/**
 * Nível em dB depois do volume e antes do portão.
 * Na chamada lê o processador; fora dela abre o microfone só para a barra.
 * Exemplo: `const levelDb = useMicLevel(prefs, inCall)`
 */
export function useMicLevel(prefs: MicPreferences, inCall: boolean): number {
  const [levelDb, setLevelDb] = useState(METER_MIN_DB)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  useEffect(() => {
    if (inCall) return pollCallLevel(setLevelDb)
    return pollPreview(prefs, prefsRef, setLevelDb)
  }, [prefs.deviceId, prefs.noiseSuppression, prefs.echoCancellation, prefs.autoGainControl, inCall])

  return levelDb
}

function pollCallLevel(setLevelDb: (db: number) => void): () => void {
  const timer = window.setInterval(() => {
    setLevelDb(voiceSession.inputLevelDb() ?? METER_MIN_DB)
  }, METER_MS)
  return () => window.clearInterval(timer)
}

function pollPreview(prefs: MicPreferences, prefsRef: { current: MicPreferences }, setLevelDb: (db: number) => void): () => void {
  let closed = false
  let tap: PreviewTap | undefined
  void openPreview(prefs, prefsRef).then((opened) => {
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

async function openPreview(prefs: MicPreferences, prefsRef: { current: MicPreferences }): Promise<PreviewTap> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: previewConstraints(prefs) })
  const track = stream.getAudioTracks()[0]
  if (!track) {
    stream.getTracks().forEach((item) => item.stop())
    throw new Error('getUserMedia devolveu stream sem faixa de áudio; esperado um microfone')
  }
  return tapTrack(track, prefsRef)
}

function previewConstraints(prefs: MicPreferences): MediaTrackConstraints {
  const options = captureOptions(prefs)
  const deviceId = options.deviceId === 'default' ? undefined : { exact: String(options.deviceId) }
  return { ...options, deviceId }
}

function tapTrack(track: MediaStreamTrack, prefsRef: { current: MicPreferences }): PreviewTap {
  const context = new AudioContext()
  const chain = createMicChain(context, track, prefsRef.current.inputGain)
  return {
    readDb: () => readPreview(chain, prefsRef.current),
    close: () => closePreview(chain, context, track),
  }
}

function readPreview(chain: MicChain, prefs: MicPreferences): number {
  if (chain.sliderGain !== prefs.inputGain) setSliderGain(chain, prefs.inputGain)
  const post = readChainRms(chain)
  followLeveler(chain, post, prefs.autoGainControl)
  return rmsToDb(post)
}

function closePreview(chain: MicChain, context: AudioContext, track: MediaStreamTrack): void {
  chain.source.disconnect()
  void context.close()
  track.stop()
}

interface PreviewTap {
  readDb: () => number
  close: () => void
}
