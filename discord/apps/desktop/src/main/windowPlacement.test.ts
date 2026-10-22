import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  launchPlacement,
  placementFromWindow,
  readWindowPlacement,
  rememberPlacement,
  writeWindowPlacement,
  type WindowPlacement,
} from './windowPlacement'

const DISPLAY = { x: 0, y: 0, width: 1920, height: 1080 }

const SAVED: WindowPlacement = {
  x: 40,
  y: 80,
  width: 1280,
  height: 800,
  maximized: false,
  fullscreen: false,
}

describe('windowPlacement', () => {
  it('guarda o tamanho restaurado e se a janela estava em tela cheia', () => {
    const placement = placementFromWindow({
      getNormalBounds: () => ({ x: 10, y: 20, width: 1100, height: 700 }),
      isMaximized: () => false,
      isFullScreen: () => true,
    })

    expect(placement).toEqual({ x: 10, y: 20, width: 1100, height: 700, maximized: false, fullscreen: true })
  })

  it('arquivo ausente ou quebrado não inventa um tamanho', () => {
    const dir = mkdtempSync(join(tmpdir(), 'radcord-window-'))
    expect(readWindowPlacement(join(dir, 'ausente.json'))).toBeNull()
    const broken = join(dir, 'window-placement.json')
    writeFileSync(broken, '{"width":"larga"}')
    expect(readWindowPlacement(broken)).toBeNull()
  })

  it('lembra a tela cheia mesmo se o getter da janela já voltou', () => {
    const memory = rememberPlacement(SAVED)
    memory.noteFullscreen(true)
    memory.noteBounds({ x: 12, y: 24, width: 1400, height: 900 })
    expect(memory.current()).toEqual({ ...SAVED, x: 12, y: 24, width: 1400, height: 900, fullscreen: true })
  })

  it('relê o mesmo retângulo na próxima abertura', () => {
    const filePath = join(mkdtempSync(join(tmpdir(), 'radcord-window-')), 'window-placement.json')
    const fullscreen = { ...SAVED, fullscreen: true }

    writeWindowPlacement(filePath, fullscreen)

    expect(readWindowPlacement(filePath)).toEqual(fullscreen)
    expect(launchPlacement(fullscreen, [DISPLAY])?.fullscreen).toBe(true)
  })

  it('descarta um tamanho que ficou fora dos monitores', () => {
    const offscreen = { ...SAVED, x: 4000, y: 4000 }
    expect(launchPlacement(offscreen, [DISPLAY])).toBeNull()
  })

  it('reabre maximizado no primeiro monitor se o anterior sumiu', () => {
    const maximized = { ...SAVED, x: 4000, maximized: true }
    expect(launchPlacement(maximized, [DISPLAY])).toEqual({ ...maximized, x: 0, y: 0 })
  })
})
