import type { MicPreferences } from './micPreferences'
import { monitorCapture } from './micPreferences'
import { CLOSED_GATE, rmsToDb, stepGate, type GateState } from './micLevel'
import { rmsLevel } from './speakingLevel'

const TICK_MS = 32

export interface LocalEarPrefs {
  inputGain: number
  gateDb: number
}

/**
 * Captura do teste local: o mesmo microfone da escuta, sem eco, sem canal.
 * Exemplo: `localEarConstraints(prefs).echoCancellation` é `{ exact: false }`.
 */
export function localEarConstraints(prefs: MicPreferences): MediaTrackConstraints {
  const options = monitorCapture(prefs, true)
  const deviceId = options.deviceId === 'default' ? undefined : { exact: String(options.deviceId) }
  return { ...options, deviceId }
}

/**
 * Toca o microfone neste PC para testar fora da chamada.
 * O portão e o volume seguem as preferências enquanto a escuta durar.
 * Exemplo: `const stop = await startLocalEar(prefs, () => useMicPrefsStore.getState())`.
 */
export async function startLocalEar(prefs: MicPreferences, readPrefs: () => LocalEarPrefs): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: localEarConstraints(prefs) })
  const track = stream.getAudioTracks()[0]
  if (!track) {
    stream.getTracks().forEach((item) => item.stop())
    throw new Error('getUserMedia devolveu stream sem faixa de áudio; esperado um microfone')
  }
  return playTrack(track, readPrefs)
}

function playTrack(track: MediaStreamTrack, readPrefs: () => LocalEarPrefs): () => void {
  const context = new AudioContext()
  const source = context.createMediaStreamSource(new MediaStream([track]))
  const volume = context.createGain()
  const gate = context.createGain()
  const analyser = context.createAnalyser()
  analyser.fftSize = 512
  const samples = new Uint8Array(analyser.fftSize)
  let gateState: GateState = CLOSED_GATE
  source.connect(volume)
  volume.connect(analyser)
  volume.connect(gate)
  gate.connect(context.destination)
  const timer = window.setInterval(() => tickLocalEar(readPrefs(), volume, gate, analyser, samples, gateState, (next) => {
    gateState = next
  }), TICK_MS)
  void context.resume()
  return () => stopLocalEar(timer, source, context, track)
}

function tickLocalEar(
  prefs: LocalEarPrefs,
  volume: GainNode,
  gate: GainNode,
  analyser: AnalyserNode,
  samples: Uint8Array,
  state: GateState,
  setState: (next: GateState) => void,
): void {
  volume.gain.value = prefs.inputGain
  analyser.getByteTimeDomainData(samples)
  const next = stepGate(state, rmsToDb(rmsLevel(samples)), prefs.gateDb, TICK_MS)
  setState(next)
  gate.gain.value = next.open ? 1 : 0
}

function stopLocalEar(timer: number, source: MediaStreamAudioSourceNode, context: AudioContext, track: MediaStreamTrack): void {
  window.clearInterval(timer)
  source.disconnect()
  void context.close()
  track.stop()
}
