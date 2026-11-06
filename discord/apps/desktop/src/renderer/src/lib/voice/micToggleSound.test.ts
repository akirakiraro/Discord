import { describe, expect, it } from 'vitest'
import { OPEN_MIC } from './micDeafen'
import { deafenToggleSound, micToggleSound, toggleNotes, toggleSpan, type ToggleSound } from './micToggleSound'

const KINDS: ToggleSound[] = ['mute', 'unmute', 'deafen', 'undeafen']

function hertz(kind: ToggleSound): number[] {
  return toggleNotes(kind).map((note) => note.hz)
}

describe('micToggleSound', () => {
  it('o microfone desce ao mutar e sobe ao desmutar', () => {
    expect(micToggleSound(OPEN_MIC)).toBe('mute')
    expect(micToggleSound({ ...OPEN_MIC, micMuted: true })).toBe('unmute')
    expect(hertz('mute')[0]).toBeGreaterThan(hertz('mute')[1] ?? 0)
    expect(hertz('unmute')[0]).toBeLessThan(hertz('unmute')[1] ?? 0)
  })

  it('ensurdecer desce mais grave e desensurdecer sobe', () => {
    expect(deafenToggleSound(OPEN_MIC)).toBe('deafen')
    expect(deafenToggleSound({ deafened: true })).toBe('undeafen')
    expect(hertz('deafen')[0]).toBeGreaterThan(hertz('deafen')[1] ?? 0)
    expect(hertz('undeafen')[0]).toBeLessThan(hertz('undeafen')[1] ?? 0)
    expect(hertz('deafen')).not.toEqual(hertz('mute'))
  })

  it('surdo no botão do microfone toca a volta do áudio, não um mute extra', () => {
    expect(micToggleSound({ micMuted: true, deafened: true })).toBe('undeafen')
  })

  it('cada clique dura menos de 0,25 s e as quatro sequências são diferentes', () => {
    const sequences = KINDS.map((kind) => hertz(kind).join(','))

    expect(new Set(sequences).size).toBe(KINDS.length)
    for (const kind of KINDS) {
      expect(toggleSpan(toggleNotes(kind)), kind).toBeLessThan(0.25)
      expect(toggleNotes(kind)).toHaveLength(2)
    }
  })
})
