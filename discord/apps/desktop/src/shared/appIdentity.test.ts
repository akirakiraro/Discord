import { describe, expect, it } from 'vitest'
import { APP_USER_MODEL_ID, LEGACY_USER_DATA_DIRECTORY, PRODUCT_DISPLAY_NAME } from './appIdentity'

describe('appIdentity', () => {
  it('separa o nome visível da pasta e do id que a instalação já usa', () => {
    expect(PRODUCT_DISPLAY_NAME).toBe('SoundRoom')
    expect(LEGACY_USER_DATA_DIRECTORY).toBe('Radcord')
    expect(APP_USER_MODEL_ID).toBe('dev.radcord.desktop')
  })
})
