import { describe, expect, it } from 'vitest'
import { TYPING_NOTIFY_INTERVAL_MS, shouldNotifyTyping } from './typingThrottle'

describe('shouldNotifyTyping', () => {
  it('avisa na primeira tecla', () => {
    expect(shouldNotifyTyping(null, 0)).toBe(true)
  })

  it('segura avisos repetidos dentro do intervalo', () => {
    expect(shouldNotifyTyping(1000, 1000 + TYPING_NOTIFY_INTERVAL_MS - 1)).toBe(false)
    expect(shouldNotifyTyping(1000, 1000 + TYPING_NOTIFY_INTERVAL_MS)).toBe(true)
  })
})
