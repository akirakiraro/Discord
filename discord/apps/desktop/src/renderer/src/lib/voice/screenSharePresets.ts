import type { ScreenShareCaptureOptions, TrackPublishOptions, VideoResolution } from 'livekit-client'

export type ShareQuality = '720p' | '1080p' | 'native'
export type ShareFrameRate = 15 | 30 | 60

export const SHARE_QUALITIES: readonly ShareQuality[] = ['720p', '1080p', 'native']
export const SHARE_FRAME_RATES: readonly ShareFrameRate[] = [15, 30, 60]
export const DEFAULT_SHARE_QUALITY: ShareQuality = 'native'
export const DEFAULT_SHARE_FRAME_RATE: ShareFrameRate = 60

const HD_BITRATE = 3_000_000
const HD_AREA = 1920 * 1080

const FRAME_SIZE: Record<ShareQuality, VideoResolution> = {
  '720p': { width: 1280, height: 720, frameRate: 30 },
  '1080p': { width: 1920, height: 1080, frameRate: 30 },
  native: { width: 3840, height: 2160, frameRate: 30 },
}

export interface ScreenShareSettings {
  capture: ScreenShareCaptureOptions
  publish: TrackPublishOptions
}

/**
 * Monta captura e encoding do vídeo. O áudio da tela entra por outra faixa, só do processo escolhido.
 * Exemplo: `screenShareSettings('1080p', 30)`
 */
export function screenShareSettings(quality: ShareQuality, frameRate: ShareFrameRate): ScreenShareSettings {
  const size = FRAME_SIZE[quality]
  return {
    capture: {
      audio: false,
      contentHint: 'motion',
      resolution: { width: size.width, height: size.height, frameRate },
    },
    publish: { screenShareEncoding: { maxBitrate: shareBitrate(quality, frameRate), maxFramerate: frameRate } },
  }
}

function shareBitrate(quality: ShareQuality, frameRate: ShareFrameRate): number {
  const size = FRAME_SIZE[quality]
  const areaRatio = (size.width * size.height) / HD_AREA
  return Math.round(HD_BITRATE * areaRatio * (frameRate / 30))
}
