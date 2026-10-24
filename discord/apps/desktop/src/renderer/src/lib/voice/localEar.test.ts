import { describe, expect, it } from 'vitest'
import { DEFAULT_MIC_PREFERENCES } from './micPreferences'
import { localEarConstraints } from './localEar'

describe('localEarConstraints', () => {
  it('desliga o eco para o teste local não apagar a própria voz', () => {
    const constraints = localEarConstraints(DEFAULT_MIC_PREFERENCES)

    expect(constraints.echoCancellation).toEqual({ exact: false })
    expect(constraints.deviceId).toBeUndefined()
  })
})
