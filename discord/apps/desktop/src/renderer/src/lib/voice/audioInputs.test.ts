import { describe, expect, it, vi } from 'vitest'
import { audioInputLabel, listAudioInputs, type AudioInputDevice, type AudioInputSource } from './audioInputs'

function source(pages: AudioInputDevice[][], stop = vi.fn()): AudioInputSource {
  const pending = [...pages]
  return {
    enumerateDevices: async () => pending.shift() ?? [],
    requestMicrophone: async () => ({ stop }),
  }
}

const HEADSET: AudioInputDevice = { deviceId: 'headset', kind: 'audioinput', label: 'Headset' }
const HIDDEN: AudioInputDevice = { deviceId: 'hidden', kind: 'audioinput', label: '' }
const CAMERA: AudioInputDevice = { deviceId: 'cam', kind: 'videoinput', label: 'Camera' }

describe('audioInputs', () => {
  it('não pede permissão quando o nome já veio na lista', async () => {
    const stop = vi.fn()

    const devices = await listAudioInputs(source([[HEADSET, CAMERA]], stop))

    expect(devices).toEqual([HEADSET])
    expect(stop).not.toHaveBeenCalled()
  })

  it('pede o microfone quando os rótulos ainda estão vazios', async () => {
    const stop = vi.fn()

    const devices = await listAudioInputs(source([[HIDDEN], [HEADSET]], stop))

    expect(stop).toHaveBeenCalledOnce()
    expect(devices).toEqual([HEADSET])
  })

  it('audioInputLabel numera microfones sem nome', () => {
    expect(audioInputLabel(HIDDEN, 1)).toBe('Microfone 2')
    expect(audioInputLabel(HEADSET, 0)).toBe('Headset')
  })
})
