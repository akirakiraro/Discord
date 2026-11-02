import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ListenerVolumePanel } from './ListenerVolumeToggle'

describe('popover de volume', () => {
  it('mostra a porcentagem e o jeito de voltar a 100%', () => {
    const html = renderToStaticMarkup(
      <ListenerVolumePanel
        panel={{ current: null }}
        name="Ela"
        percent={150}
        style={{ position: 'fixed' }}
        onPercent={() => undefined}
        onReset={() => undefined}
      />,
    )

    expect(html).toContain('Volume de Ela')
    expect(html).toContain('150%')
    expect(html).toContain('Volume normal')
    expect(html).toContain('100% não altera o áudio')
    expect(html).toContain('aria-valuetext="150%"')
  })
})
