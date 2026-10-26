import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AudioProbeSheet, CallAudioProbeButton } from './CallAudioProbe'
import type { CallAudioProbeView } from '../../lib/voice/callAudioProbe'

const noop = (): undefined => undefined

describe('botão do diagnóstico', () => {
  it('só aparece para akira dentro da call', () => {
    expect(renderToStaticMarkup(<CallAudioProbeButton username="Bia" inCall open={false} onToggle={noop} />)).toBe('')
    expect(renderToStaticMarkup(<CallAudioProbeButton username="Akira" inCall={false} open={false} onToggle={noop} />)).toBe('')
    expect(renderToStaticMarkup(<CallAudioProbeButton username={null} inCall open={false} onToggle={noop} />)).toBe('')

    const html = renderToStaticMarkup(<CallAudioProbeButton username="AKIRA" inCall open={false} onToggle={noop} />)
    expect(html).toContain('Áudio')
    expect(html).toContain('Diagnóstico de áudio da call')
    expect(html).not.toContain('Perda')
  })

  it('mostra a perda formatada e pinta o valor ruim', () => {
    const html = renderToStaticMarkup(<AudioProbeSheet view={badView()} onClose={noop} />)

    expect(html).toContain('Bia · recebido')
    expect(html).toContain('2,1%')
    expect(html).toContain('audio-probe__value--bad')
    expect(html).toContain('Estas medidas não saem para o servidor')
    expect(html).toContain('Isolamento de voz')
    expect(html).toContain('ligado')
  })
})

function badView(): CallAudioProbeView {
  return {
    legs: [{ key: 'in:bia', title: 'Bia · recebido', metrics: [{ label: 'Perda', value: '2,1%', tone: 'bad' }] }],
    capture: [{ label: 'Isolamento de voz', value: 'ligado', tone: 'bad' }],
    empty: null,
  }
}
