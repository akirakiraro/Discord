import type { MicPreferences } from './micPreferences'
import { monitorCapture } from './micPreferences'
import { CLOSED_GATE, rmsToDb, stepGate, type GateState } from './micLevel'
import { aimGateOpen, createMicChain, followLeveler, readChainRms, setSliderGain, type MicChain } from './micGain'

const TICK_MS = 32

export interface LocalEarPrefs {
  inputGain: number
  gateDb: number
  autoGainControl: boolean
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
  const chain = createMicChain(context, track, readPrefs().inputGain)
  chain.gate.connect(context.destination)
  let gateState: GateState = CLOSED_GATE
  const timer = window.setInterval(() => {
    gateState = tickLocalEar(readPrefs(), chain, gateState)
  }, TICK_MS)
  return () => stopLocalEar(timer, chain.source, context, track)
}

function tickLocalEar(prefs: LocalEarPrefs, chain: MicChain, state: GateState): GateState {
  if (chain.sliderGain !== prefs.inputGain) setSliderGain(chain, prefs.inputGain)
  const post = readChainRms(chain)
  followLeveler(chain, post, prefs.autoGainControl)
  return stepLocalGate(chain, state, rmsToDb(post), prefs.gateDb)
}

function stepLocalGate(chain: MicChain, state: GateState, levelDb: number, gateDb: number): GateState {
  const next = stepGate(state, levelDb, gateDb, TICK_MS)
  if (next.open !== state.open) aimGateOpen(chain.gate.gain, next.open, chain.context.currentTime)
  return next
}

function stopLocalEar(timer: number, source: MediaStreamAudioSourceNode, context: AudioContext, track: MediaStreamTrack): void {
  window.clearInterval(timer)
  source.disconnect()
  void context.close()
  track.stop()
}
