import { describe, expect, it } from 'vitest'
import { windowIconFile } from './windowIcon'

describe('windowIconFile', () => {
  it('no dev aponta para build/icon.png', () => {
    expect(windowIconFile('C:/app/resources', 'C:/repo/apps/desktop', false)).toBe('C:/repo/apps/desktop/build/icon.png')
  })

  it('no pacote aponta para o extraResource', () => {
    expect(windowIconFile('C:/app/resources', 'C:/repo/apps/desktop', true)).toBe('C:/app/resources/icon.png')
  })

  it('recusa diretório vazio', () => {
    expect(() => windowIconFile('  ', 'C:/repo', true)).toThrow(/resourcesPath vazio/)
    expect(() => windowIconFile('C:/app', '', false)).toThrow(/appPath vazio/)
  })
})
