import type { CallSoundKind } from './callChime'

/** Pico do oscilador. O slider chega em 1 e o som continua curto, sem estourar. */
const PEAK_GAIN = 0.2
const NOTE_GAP_S = 0.16
const NOTE_S = 0.22

export interface ChimeNote {
  hz: number
  start: number
  duration: number
}

/**
 * Duas notas subindo na entrada e descendo na saída. A duração fica abaixo de 0,6 s.
 * Exemplo: `chimeNotes('join').map((note) => note.hz)` cresce.
 */
export function chimeNotes(kind: CallSoundKind): ChimeNote[] {
  const tones = kind === 'join' ? [523.25, 659.25] : [659.25, 523.25]
  return tones.map((hz, index) => ({ hz, start: index * NOTE_GAP_S, duration: NOTE_S }))
}

/**
 * Exemplo: `chimeSpan(chimeNotes('leave'))` é menor que `0.6`.
 */
export function chimeSpan(notes: readonly ChimeNote[]): number {
  return notes.reduce((max, note) => Math.max(max, note.start + note.duration), 0)
}

/**
 * Id de saída que vale a pena passar ao `setSinkId`. Vazio e `default` ficam no dispositivo do sistema.
 * Exemplo: `chosenSinkId('default')` devolve `null`.
 */
export function chosenSinkId(deviceId: string | null | undefined): string | null {
  if (typeof deviceId !== 'string') return null
  const trimmed = deviceId.trim()
  if (trimmed === '' || trimmed === 'default') return null
  return trimmed
}

/**
 * O primeiro `<audio>` que já aponta para um dispositivo de verdade.
 * Exemplo: `sinkIdFromElements([{ sinkId: 'default' }, { sinkId: 'headset' }])` devolve `'headset'`.
 */
export function sinkIdFromElements(elements: readonly { sinkId?: string }[]): string | null {
  for (const element of elements) {
    const chosen = chosenSinkId(element.sinkId)
    if (chosen) return chosen
  }
  return null
}

/**
 * Prefere o dispositivo que o LiveKit já usa; senão, o de um `<audio>` da página.
 * Exemplo: `callSoundSinkId('headset', [])` devolve `'headset'`.
 */
export function callSoundSinkId(activeDeviceId: string | null | undefined, elements: readonly { sinkId?: string }[]): string | null {
  return chosenSinkId(activeDeviceId) ?? sinkIdFromElements(elements)
}

export interface ChimeAudio {
  currentTime: number
  state: AudioContextState
  destination: AudioNode
  resume(): Promise<void>
  createOscillator(): OscillatorNode
  createGain(): GainNode
  setSinkId?: (sinkId: string) => Promise<void>
}

/**
 * Toca o sino num `AudioContext` novo. Falha de autoplay ou de `setSinkId` não escapa.
 * Exemplo: `player.prime()` no clique de entrar, antes do primeiro `await`.
 */
export class CallChimePlayer {
  private ctx: ChimeAudio | null = null
  private routed: string | null = null

  constructor(private readonly createContext: () => ChimeAudio | null = createBrowserAudio) {}

  prime(): void {
    const ctx = this.context()
    if (!ctx || ctx.state !== 'suspended') return
    void ctx.resume().catch(() => undefined)
  }

  play(kind: CallSoundKind, volume: number, sinkId: string | null): void {
    try {
      const ctx = this.context()
      if (!ctx) return
      this.prime()
      void this.playRouted(ctx, kind, volume, chosenSinkId(sinkId))
    } catch {
      // Sem dispositivo de áudio a call continua.
    }
  }

  private context(): ChimeAudio | null {
    if (this.ctx) return this.ctx
    try {
      this.ctx = this.createContext()
    } catch {
      this.ctx = null
    }
    return this.ctx
  }

  private async playRouted(ctx: ChimeAudio, kind: CallSoundKind, volume: number, sinkId: string | null): Promise<void> {
    try {
      await this.route(ctx, sinkId)
      renderChime(ctx, chimeNotes(kind), volume)
    } catch {
      // setSinkId ou o oscilador falhou. A call não cai.
    }
  }

  private async route(ctx: ChimeAudio, sinkId: string | null): Promise<void> {
    if (!sinkId || sinkId === this.routed || !ctx.setSinkId) return
    try {
      await ctx.setSinkId(sinkId)
      this.routed = sinkId
    } catch {
      this.routed = null
    }
  }
}

function createBrowserAudio(): ChimeAudio | null {
  if (typeof AudioContext === 'undefined') return null
  return new AudioContext()
}

function renderChime(ctx: ChimeAudio, notes: readonly ChimeNote[], volume: number): void {
  const peak = peakGain(volume)
  if (peak === 0) return
  for (const note of notes) renderNote(ctx, note, peak)
}

function renderNote(ctx: ChimeAudio, note: ChimeNote, peak: number): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const start = ctx.currentTime + note.start
  osc.type = 'sine'
  osc.frequency.setValueAtTime(note.hz, start)
  shapeNote(gain, start, note.duration, peak)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + note.duration + 0.02)
}

function shapeNote(gain: GainNode, start: number, duration: number, peak: number): void {
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
}

function peakGain(volume: number): number {
  if (!Number.isFinite(volume) || volume <= 0) return 0
  return Math.min(1, volume) * PEAK_GAIN
}
