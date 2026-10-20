import { describe, expect, it } from 'vitest'
import { chatImageSize, rejectOversizedChatFile } from './chatImage'

describe('chatImageSize', () => {
  it('reduz o lado maior para 1280 sem esticar', () => {
    expect(chatImageSize(2560, 1440)).toEqual({ width: 1280, height: 720 })
  })

  it('mantém um print que já cabe', () => {
    expect(chatImageSize(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('rejectOversizedChatFile', () => {
  it('aceita até 12 MB e recusa acima', () => {
    expect(rejectOversizedChatFile(12_000_000)).toBeNull()
    expect(rejectOversizedChatFile(12_000_001)).toContain('12000001')
  })
})
