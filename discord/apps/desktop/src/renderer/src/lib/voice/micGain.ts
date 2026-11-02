import { clampInputGain } from './micPreferences'

const LIMIT_KNEE = 0.85
const CURVE_SAMPLES = 2049
const LEVELER_TARGET_RMS = 0.1
const LEVELER_MAX_GAIN = 4
const LEVELER_MIN_GAIN = 0.25
const LEVELER_SILENCE_RMS = 0.008
const LEVELER_BLEND = 0.08
/**
 * Janela do analyser. O portão lê a cada 32 ms; 2048 amostras cobrem 42 ms a 48 kHz
 * (46 ms a 44,1 kHz), então nenhuma sílaba cai entre duas leituras. Com 512 o portão
 * via só 11 ms de cada 32.
 */
const METER_FFT = 2048
/** Abrir é rápido para não comer a largada da sílaba. */
const GATE_ATTACK_SEC = 0.005
/** Fechar desce em ~150 ms. Fechar em 10 ms cortava o fim da palavra e ligava e desligava o ruído. */
const GATE_RELEASE_SEC = 0.03

export interface ScheduledGain {
  value: number
  cancelScheduledValues(startTime: number): void
  setValueAtTime(value: number, startTime: number): void
}

export interface MicChain {
  context: AudioContext
  source: MediaStreamAudioSourceNode
  leveler: GainNode
  userGain: GainNode
  shaper: WaveShaperNode
  gate: GainNode
  analyser: AnalyserNode
  samples: Float32Array<ArrayBuffer>
  levelerGain: number
  sliderGain: number
}

/**
 * Grava o ganho neste instante. No Chromium, atribuir `.value` não altera
 * o som quando o GainNode alimenta um MediaStreamAudioDestinationNode.
 * Exemplo: `aimGain(node.gain, 4, context.currentTime)`.
 */
export function aimGain(param: ScheduledGain, value: number, now: number): void {
  const at = Number.isFinite(now) ? now : 0
  param.cancelScheduledValues(at)
  param.value = value
  param.setValueAtTime(value, at)
}

/**
 * Abre rápido e fecha com rampa, para não estalar nem cortar o fim da palavra.
 * Exemplo: `aimGateOpen(gate.gain, true, context.currentTime)`.
 */
export function aimGateOpen(param: GateParam, open: boolean, now: number): void {
  const target = open ? 1 : 0
  param.cancelScheduledValues(now)
  param.setTargetAtTime(target, now, open ? GATE_ATTACK_SEC : GATE_RELEASE_SEC)
}

/**
 * Limiter suave. Até 0,85 o sample sai igual; acima encosta em 1 sem quadrar.
 * Exemplo: `softLimitSample(0.5)` devolve `0.5`.
 */
export function softLimitSample(sample: number): number {
  const clamped = clampSigned(sample)
  const magnitude = Math.abs(clamped)
  if (magnitude <= LIMIT_KNEE) return clamped
  return Math.sign(clamped) * compressPeak(magnitude)
}

/**
 * Quanto o limiter segura um pico. 0 é a reta, sem mudança de timbre.
 * Exemplo: `limiterAttenuation(0.5)` devolve `0`.
 */
export function limiterAttenuation(sample: number): number {
  const magnitude = Math.abs(sample)
  if (!Number.isFinite(magnitude) || magnitude <= LIMIT_KNEE) return 0
  const limited = Math.abs(softLimitSample(magnitude))
  return 1 - limited / magnitude
}

/** Pico 0–1 de amostras em float. Exemplo: `peakSample(new Float32Array([-0.5, 0.25]))` devolve `0.5`. */
export function peakSample(samples: ArrayLike<number>): number {
  let peak = 0
  for (let index = 0; index < samples.length; index += 1) {
    const magnitude = Math.abs(samples[index] ?? 0)
    if (magnitude > peak) peak = magnitude
  }
  return peak
}

/**
 * RMS 0–1 de amostras em float. Exemplo: `floatRms(new Float32Array([0.5, -0.5]))` devolve `0.5`.
 */
export function floatRms(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0
    sum += sample * sample
  }
  return Math.sqrt(sum / samples.length)
}

/**
 * Lê o nível depois do slider, em float. O byte do `getByteTimeDomainData` tem
 * degrau de 1/128: tudo entre −90 e −50 dB virava −45 dB, em cima do traço padrão.
 * Exemplo: `rmsToDb(readChainRms(chain))`.
 */
export function readChainRms(chain: MicChain): number {
  chain.analyser.getFloatTimeDomainData(chain.samples)
  return floatRms(chain.samples)
}

/**
 * Curva do WaveShaper. O meio é a reta identidade: 100% não muda o timbre.
 * Exemplo: `shaper.curve = limiterCurve()`.
 */
export function limiterCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(CURVE_SAMPLES * 4))
  for (let index = 0; index < CURVE_SAMPLES; index += 1) {
    const sample = (index / (CURVE_SAMPLES - 1)) * 2 - 1
    curve[index] = softLimitSample(sample)
  }
  return curve
}

/**
 * Nível antes do slider, para o nivelador não desfazer o volume que a pessoa escolheu.
 * Exemplo: `preSliderRms(0.4, 4)` devolve `0.1`.
 */
export function preSliderRms(postGainRms: number, sliderGain: number): number {
  if (!Number.isFinite(postGainRms) || postGainRms <= 0) return 0
  if (!Number.isFinite(sliderGain) || sliderGain <= 0) return postGainRms
  return postGainRms / sliderGain
}

/**
 * Ganho do nivelador. Desligado volta a 1. Silêncio não é amplificado.
 * Exemplo: `nextLevelerGain(1, 0.05, true)` fica acima de 1.
 */
export function nextLevelerGain(current: number, rms: number, enabled: boolean): number {
  if (!enabled) return 1
  if (!Number.isFinite(rms) || rms < LEVELER_SILENCE_RMS) return glide(current, 1)
  return glide(current, clampLeveler(LEVELER_TARGET_RMS / rms))
}

/**
 * Cadeia entre o microfone e quem publica: nivelador, slider, limiter, portão.
 * O analyser é uma derivação depois do slider e antes do limiter.
 * Exemplo: `createMicChain(context, track, 1).sliderGain` é `1`.
 */
export function createMicChain(context: AudioContext, track: MediaStreamTrack, volume: number): MicChain {
  const chain = buildMicChain(context, track)
  connectMicChain(chain, track)
  primeMicChain(chain, volume)
  if (context.state === 'suspended') void context.resume()
  return chain
}

/** Aplica o slider sem recapturar. 1 é o microfone como chegou. */
export function setSliderGain(chain: MicChain, value: number): void {
  chain.sliderGain = clampInputGain(value)
  aimGain(chain.userGain.gain, chain.sliderGain, chain.context.currentTime)
}

/** Move o nivelador. Com o automático desligado, o ganho cola em 1. */
export function followLeveler(chain: MicChain, postGainRms: number, enabled: boolean): void {
  const next = nextLevelerGain(chain.levelerGain, preSliderRms(postGainRms, chain.sliderGain), enabled)
  if (Math.abs(next - chain.levelerGain) < 0.001) return
  chain.levelerGain = next
  aimGain(chain.leveler.gain, next, chain.context.currentTime)
}

interface GateParam extends ScheduledGain {
  setTargetAtTime(value: number, startTime: number, timeConstant: number): void
}

function compressPeak(magnitude: number): number {
  const room = 1 - LIMIT_KNEE
  const over = magnitude - LIMIT_KNEE
  return LIMIT_KNEE + room * Math.tanh(over / room)
}

function clampSigned(sample: number): number {
  if (!Number.isFinite(sample)) return 0
  if (sample > 1) return 1
  return Math.max(-1, sample)
}

function glide(current: number, target: number): number {
  const from = Number.isFinite(current) ? current : 1
  const step = (target - from) * LEVELER_BLEND
  return from + step
}

function clampLeveler(value: number): number {
  if (value > LEVELER_MAX_GAIN) return LEVELER_MAX_GAIN
  return Math.max(LEVELER_MIN_GAIN, value)
}

function buildMicChain(context: AudioContext, track: MediaStreamTrack): MicChain {
  const analyser = context.createAnalyser()
  analyser.fftSize = METER_FFT
  return {
    context,
    source: context.createMediaStreamSource(new MediaStream([track])),
    leveler: context.createGain(),
    userGain: context.createGain(),
    shaper: context.createWaveShaper(),
    gate: context.createGain(),
    analyser,
    samples: new Float32Array(new ArrayBuffer(analyser.fftSize * 4)),
    levelerGain: 1,
    sliderGain: 1,
  }
}

function connectMicChain(chain: MicChain, track: MediaStreamTrack): void {
  connectInput(chain, track)
  chain.leveler.connect(chain.userGain)
  chain.userGain.connect(chain.analyser)
  chain.userGain.connect(chain.shaper)
  chain.shaper.connect(chain.gate)
}

function connectInput(chain: MicChain, track: MediaStreamTrack): void {
  const channels = track.getSettings().channelCount ?? 1
  if (channels <= 1) {
    chain.source.connect(chain.leveler)
    return
  }
  // Canal 0 só. A média com um direito mudo corta 6 dB e afina a voz.
  const splitter = chain.context.createChannelSplitter(2)
  chain.source.connect(splitter)
  splitter.connect(chain.leveler, 0)
}

function primeMicChain(chain: MicChain, volume: number): void {
  const now = chain.context.currentTime
  chain.shaper.curve = limiterCurve()
  chain.shaper.oversample = '2x'
  aimGain(chain.leveler.gain, 1, now)
  aimGain(chain.gate.gain, 0, now)
  setSliderGain(chain, volume)
}
