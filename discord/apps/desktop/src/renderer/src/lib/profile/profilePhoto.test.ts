import { describe, expect, it } from 'vitest'
import { profilePhotoSize, rejectOversizedPhoto } from './profilePhoto'

describe('profilePhoto', () => {
  it('recusa arquivo acima de 1,5 MB e aceita o restante', () => {
    expect(rejectOversizedPhoto(1_500_001)).toContain('1500001')
    expect(rejectOversizedPhoto(1000)).toBeNull()
  })

  it('reduz o lado maior para 128 px', () => {
    expect(profilePhotoSize(800, 400)).toEqual({ width: 128, height: 64 })
    expect(profilePhotoSize(40, 40)).toEqual({ width: 40, height: 40 })
  })
})