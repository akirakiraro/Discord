import { describe, expect, it } from 'vitest'
import { mixPcm, parseWindowLines, pidsOnDisplay, windowHandle } from './screenAudioTargets'

describe('windowHandle', () => {
  it('lê o HWND e ignora monitor', () => {
    expect(windowHandle('window:4400:0')).toBe('4400')
    expect(windowHandle('screen:1:0')).toBeNull()
  })
})

describe('pidsOnDisplay', () => {
  const windows = parseWindowLines('10 0 0 100 100\n4 0 0 100 100\n20 2000 0 2100 100\n')

  it('fica só com processos daquele monitor', () => {
    const pids = pidsOnDisplay(windows, { x: 0, y: 0, width: 200, height: 200 }, 1, new Set([4]))

    expect(pids).toEqual([10])
  })
})

describe('mixPcm', () => {
  it('faz a média para duas faixas no máximo não estourarem', () => {
    const loud = Buffer.alloc(2)
    loud.writeInt16LE(30000, 0)
    const mixed = mixPcm([loud, loud])

    expect(mixed.readInt16LE(0)).toBe(30000)
  })
})
