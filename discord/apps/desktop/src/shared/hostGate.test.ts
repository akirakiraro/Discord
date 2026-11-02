import { describe, expect, it } from 'vitest'
import {
  HOST_SETTINGS_REQUIRE_AKIRA,
  HOST_SETTINGS_USERNAME,
  canShowHostOnLogin,
  canShowHostSettings,
  hostSettingsTab,
} from './hostGate'

describe('quem vê o host', () => {
  it('a trava atual é o username akira, sem diferenciar maiúsculas', () => {
    expect(HOST_SETTINGS_REQUIRE_AKIRA).toBe(true)
    expect(HOST_SETTINGS_USERNAME).toBe('akira')
    expect(canShowHostSettings(true, 'Akira')).toBe(true)
    expect(canShowHostSettings(true, ' akira ')).toBe(true)
    expect(canShowHostSettings(true, 'akira2')).toBe(false)
    expect(canShowHostSettings(true, null)).toBe(false)
    expect(canShowHostSettings(false, 'akira')).toBe(false)
    expect(hostSettingsTab(true, 'akira')).toEqual({ id: 'host', label: 'Host' })
    expect(hostSettingsTab(true, 'visitante')).toBeNull()
  })

  it('com a trava desligada qualquer um no PC do módulo vê a seção', () => {
    expect(canShowHostSettings(true, 'visitante', false)).toBe(true)
    expect(canShowHostSettings(false, 'visitante', false)).toBe(false)
  })

  it('a tela de entrar olha só o módulo', () => {
    expect(canShowHostOnLogin(true)).toBe(true)
    expect(canShowHostOnLogin(false)).toBe(false)
  })
})
