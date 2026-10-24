import { describe, expect, it } from 'vitest'
import {
  applyDeafenToggle,
  applyMicToggle,
  blockedEarReason,
  deafenButtonTitle,
  micButtonTitle,
  OPEN_MIC,
  type MicDeafenState,
} from './micDeafen'

const MUTED: MicDeafenState = { ...OPEN_MIC, micMuted: true }

describe('micDeafen', () => {
  it('mutar alterna e o segundo clique desmuta', () => {
    const muted = applyMicToggle(OPEN_MIC)

    expect(muted).toEqual(MUTED)
    expect(applyMicToggle(muted)).toEqual(OPEN_MIC)
  })

  it('ensurdecer muta o microfone e o áudio ao mesmo tempo', () => {
    expect(applyDeafenToggle(OPEN_MIC)).toEqual({
      micMuted: true,
      deafened: true,
      micMutedBeforeDeafen: false,
    })
  })

  it('clicar em mutar enquanto surdo desmuta o microfone e o áudio', () => {
    const deaf = applyDeafenToggle(OPEN_MIC)

    expect(applyMicToggle(deaf)).toEqual(OPEN_MIC)
  })

  it('mutar enquanto surdo desmuta os dois mesmo se o mute anterior estava ligado', () => {
    const deaf = applyDeafenToggle(MUTED)

    expect(deaf.micMutedBeforeDeafen).toBe(true)
    expect(applyMicToggle(deaf)).toEqual(OPEN_MIC)
  })

  it('desensurdecer devolve o mute de antes', () => {
    const deaf = applyDeafenToggle(MUTED)

    expect(applyDeafenToggle(deaf)).toEqual(MUTED)
  })

  it('desensurdecer com o microfone aberto devolve o microfone aberto', () => {
    expect(applyDeafenToggle(applyDeafenToggle(OPEN_MIC))).toEqual(OPEN_MIC)
  })

  it('surdo implica microfone mutado', () => {
    const samples = [OPEN_MIC, MUTED, applyDeafenToggle(OPEN_MIC), applyDeafenToggle(MUTED)]

    for (const state of samples) {
      if (state.deafened) expect(state.micMuted, 'surdo sem fala').toBe(true)
    }
  })

  it('o botão de microfone fica clicável e diz o que o clique faz', () => {
    expect(micButtonTitle(OPEN_MIC)).toBe('Mutar')
    expect(micButtonTitle(MUTED)).toBe('Desmutar')
    expect(micButtonTitle({ micMuted: true, deafened: true })).toBe('Desmutar e ouvir')
    expect(deafenButtonTitle(false)).toBe('Ensurdecer')
    expect(deafenButtonTitle(true)).toBe('Desensurdecer')
  })

  it('o Me ouvir não abre mutado nem surdo', () => {
    expect(blockedEarReason(OPEN_MIC)).toBeNull()
    expect(blockedEarReason(MUTED)).toMatch(/mutado/)
    expect(blockedEarReason({ micMuted: true, deafened: true })).toMatch(/surdo/)
  })
})
