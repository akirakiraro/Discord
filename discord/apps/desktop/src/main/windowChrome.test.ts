import { describe, expect, it } from 'vitest'
import { windowChrome } from './windowChrome'

describe('windowChrome', () => {
  it('usa o fundo mais escuro do app na barra nativa', () => {
    expect(windowChrome.backgroundColor).toBe('#1e1f22')
    expect(windowChrome.titleBarOverlay.color).toBe('#1e1f22')
    expect(windowChrome.titleBarOverlay.symbolColor).toBe('#dbdee1')
    expect(windowChrome.titleBarStyle).toBe('hidden')
    expect(windowChrome.titleBarOverlay.height).toBeGreaterThan(0)
  })
})
