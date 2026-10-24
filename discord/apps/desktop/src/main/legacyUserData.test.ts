import { describe, expect, it } from 'vitest'
import { LEGACY_USER_DATA_DIRECTORY } from '../shared/appIdentity'
import { legacyUserDataPath } from './legacyUserData'

describe('legacyUserDataPath', () => {
  it('mantém a pasta Radcord dentro do AppData', () => {
    const appData = 'C:/Users/akira/AppData/Roaming'
    expect(legacyUserDataPath(appData)).toBe(`${appData}/${LEGACY_USER_DATA_DIRECTORY}`)
  })

  it('recusa appData vazio', () => {
    expect(() => legacyUserDataPath('  ')).toThrow(/appData vazio/)
    expect(() => legacyUserDataPath('')).toThrow(/recebido ""/)
  })
})
