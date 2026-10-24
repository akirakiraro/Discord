import { describe, expect, it } from 'vitest'
import { parseUpdateSnapshot, updateBlocksLogin, SKIPPED_UPDATE, UNREADABLE_UPDATE } from './desktopUpdateSnapshot'

describe('parseUpdateSnapshot', () => {
  it('aceita o estado que o processo principal publica', () => {
    const snapshot = { phase: 'downloading' as const, version: '0.1.117', progress: null, message: null }

    expect(parseUpdateSnapshot(snapshot)).toEqual(snapshot)
    expect(updateBlocksLogin(snapshot)).toBe(true)
  })

  it('IPC ilegível continua bloqueando o login', () => {
    const parsed = parseUpdateSnapshot({ phase: 'current', version: 1 })

    expect(parsed).toEqual(UNREADABLE_UPDATE)
    expect(updateBlocksLogin(parsed)).toBe(true)
    expect(updateBlocksLogin(SKIPPED_UPDATE)).toBe(false)
  })
})
