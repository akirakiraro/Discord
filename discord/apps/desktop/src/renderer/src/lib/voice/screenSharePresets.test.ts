import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHARE_FRAME_RATE,
  DEFAULT_SHARE_QUALITY,
  screenShareSettings,
} from './screenSharePresets'

describe('screenShareSettings', () => {
  it('deixa o padrão no máximo: nativa a 60 fps', () => {
    const settings = screenShareSettings(DEFAULT_SHARE_QUALITY, DEFAULT_SHARE_FRAME_RATE)

    expect(DEFAULT_SHARE_QUALITY).toBe('native')
    expect(DEFAULT_SHARE_FRAME_RATE).toBe(60)
    expect(settings.capture.resolution).toEqual({ width: 3840, height: 2160, frameRate: 60 })
    expect(settings.capture.audio).toBe(false)
  })

  it('mantém 1080p a 30 fps em 3 Mbps', () => {
    const settings = screenShareSettings('1080p', 30)

    expect(settings.publish.screenShareEncoding).toEqual({ maxBitrate: 3_000_000, maxFramerate: 30 })
  })

  it('sobe o bitrate com a área e o fps', () => {
    const settings = screenShareSettings('720p', 15)

    expect(settings.capture.resolution).toEqual({ width: 1280, height: 720, frameRate: 15 })
    expect(settings.publish.screenShareEncoding?.maxBitrate).toBe(666_667)
  })
})
