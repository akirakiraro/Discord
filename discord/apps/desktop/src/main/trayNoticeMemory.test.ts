import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasSeenTrayNotice, markTrayNoticeSeen } from './trayNoticeMemory'

describe('aviso da bandeja uma vez só', () => {
  it('começa como não visto e depois de marcado fica visto', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'radcord-tray-')), 'tray-notice-seen')
    expect(hasSeenTrayNotice(file)).toBe(false)
    markTrayNoticeSeen(file)
    expect(hasSeenTrayNotice(file)).toBe(true)
  })

  it('cria a pasta que faltar', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'radcord-tray-')), 'a', 'b', 'tray-notice-seen')
    markTrayNoticeSeen(file)
    expect(hasSeenTrayNotice(file)).toBe(true)
  })

  it('disco que falha não lança', () => {
    expect(() => markTrayNoticeSeen('/dev/null/x/tray-notice-seen')).not.toThrow()
  })
})
