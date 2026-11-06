import { toggleNotes, type ToggleNote, type ToggleSound } from './micToggleSound'

/** Pico baixo de propósito. O clique confirma o botão e não cobre a fala. */
const PEAK_GAIN = 0.08

export interface ToggleAudio {
  currentTime: number
  state: AudioContextState
  destination: AudioNode
  resume(): Promise<void>
  createOscillator(): OscillatorNode
  createGain(): GainNode
}

/**
 * Bip curto num `AudioContext` só deste PC. O destino é a saída local.
 * Não há `MediaStream` nem faixa para o LiveKit publicar.
 * Exemplo: `player.play('mute')` no clique, antes de mudar o estado.
 */
export class MicTogglePlayer {
  private ctx: ToggleAudio | null = null

  constructor(private readonly createContext: () => ToggleAudio | null = createBrowserAudio) {}

  play(kind: ToggleSound): void {
    try {
      const ctx = this.context()
      if (!ctx) return
      this.resume(ctx)
      renderToggle(ctx, toggleNotes(kind))
    } catch {
      // Sem placa o botão ainda alterna.
    }
  }

  private context(): ToggleAudio | null {
    if (this.ctx) return this.ctx
    try {
      this.ctx = this.createContext()
    } catch {
      this.ctx = null
    }
    return this.ctx
  }

  private resume(ctx: ToggleAudio): void {
    if (ctx.state !== 'suspended') return
    void ctx.resume().catch(() => undefined)
  }
}

function renderToggle(ctx: ToggleAudio, notes: readonly ToggleNote[]): void {
  for (const note of notes) renderNote(ctx, note)
}

function renderNote(ctx: ToggleAudio, note: ToggleNote): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const start = ctx.currentTime + note.start
  osc.type = 'sine'
  osc.frequency.setValueAtTime(note.hz, start)
  shapeNote(gain, start, note.duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + note.duration + 0.02)
}

function shapeNote(gain: GainNode, start: number, duration: number): void {
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
}

function createBrowserAudio(): ToggleAudio | null {
  if (typeof AudioContext === 'undefined') return null
  return new AudioContext()
}
