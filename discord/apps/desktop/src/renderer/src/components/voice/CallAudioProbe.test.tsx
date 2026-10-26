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
    expect(html).toContain('Debug de áudio da call')
    expect(html).not.toContain('Perda')
  })

  it('mostra a perda formatada e pinta o valor ruim', () => {
    const html = renderToStaticMarkup(<AudioProbeSheet view={badView()} onClose={noop} onCopy={noop} onSave={noop} />)

    expect(html).toContain('Bia · recebido')
    expect(html).toContain('2,1%')
    expect(html).toContain('audio-probe__value--bad')
    expect(html).toContain('Nada disto sai para o servidor')
    expect(html).toContain('Isolamento de voz')
    expect(html).toContain('ligado')
    expect(html).toContain('Copiar JSON')
    expect(html).toContain('Salvar arquivo')
    expect(html).toContain('entrou')
    expect(html).toContain('<polyline')
  })
})

function badView(): CallAudioProbeView {
  return {
    legs: [{ key: 'in:bia', title: 'Bia · recebido', metrics: [{ label: 'Perda', value: '2,1%', tone: 'bad' }] }],
    capture: [{ label: 'Isolamento de voz', value: 'ligado', tone: 'bad' }],
    chain: [{ label: 'Portão', value: 'fechado', tone: 'idle' }],
    volumes: [{ label: 'Volume de Bia', value: '100%', tone: 'ok' }],
    context: [{ label: 'Taxa do contexto', value: '48 kHz', tone: 'ok' }],
    history: { 'in:bia': [{ atMs: 1_000, loss: 0.021, jitterMs: 12, bitrate: 128_000 }] },
    events: [{ atMs: 1_000, kind: 'entrou', detail: 'Bia' }],
    empty: null,
  }
}
