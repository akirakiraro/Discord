import { describe, expect, it } from 'vitest'
import { HOST_ERROR, firewallElevationFailure } from './hostMessages'
import { firewallElevationCommand, firewallQueryCommand, firewallRulesPresent } from './hostFirewallPlan'

const RULES = 'SoundRoom - API do host\nSoundRoom - LiveKit sinalizacao\nSoundRoom - LiveKit midia'

describe('firewall do host', () => {
  it('só marca ok quando as três regras aparecem', () => {
    expect(firewallRulesPresent(RULES)).toBe(true)
    expect(firewallRulesPresent('SoundRoom - API do host\nSoundRoom - LiveKit sinalizacao')).toBe(false)
    expect(firewallRulesPresent('')).toBe(false)
  })

  it('consulta o grupo e pede o UAC no script, sem criar regra no app', () => {
    expect(firewallQueryCommand()).toEqual({
      file: 'powershell.exe',
      args: [
        '-NoProfile',
        '-Command',
        'Get-NetFirewallRule -Group SoundRoom -ErrorAction SilentlyContinue | Select-Object -ExpandProperty DisplayName',
      ],
    })
    expect(firewallElevationCommand('C:/repo/infra/host/open-firewall.ps1')).toEqual({
      file: 'powershell.exe',
      args: [
        '-NoProfile',
        '-Command',
        "Start-Process -FilePath powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ''C:/repo/infra/host/open-firewall.ps1'''",
      ],
    })
  })

  it('cancelar o UAC e um código diferente têm frases diferentes', () => {
    expect(firewallElevationFailure(0, '')).toBe(HOST_ERROR.firewallReady)
    expect(firewallElevationFailure(1223, '')).toBe(HOST_ERROR.firewallCancelled)
    expect(firewallElevationFailure(1, 'acesso negado')).toBe(
      'Não foi possível abrir o firewall (código 1). O Windows precisa de administrador. Saída: acesso negado',
    )
  })
})
