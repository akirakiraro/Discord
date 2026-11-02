export const FIREWALL_RULES = [
  'SoundRoom - API do host',
  'SoundRoom - LiveKit sinalizacao',
  'SoundRoom - LiveKit midia',
] as const

/**
 * As três regras do grupo SoundRoom precisam aparecer na saída.
 * Exemplo: `firewallRulesPresent(output)`.
 */
export function firewallRulesPresent(output: string): boolean {
  return FIREWALL_RULES.every((name) => output.includes(name))
}

/**
 * Consulta só o grupo SoundRoom. Exemplo: `firewallQueryCommand()`.
 */
export function firewallQueryCommand(): { file: string; args: string[] } {
  return {
    file: 'powershell.exe',
    args: [
      '-NoProfile',
      '-Command',
      'Get-NetFirewallRule -Group SoundRoom -ErrorAction SilentlyContinue | Select-Object -ExpandProperty DisplayName',
    ],
  }
}

/**
 * Pede o UAC. O app não cria a regra. Exemplo: `firewallElevationCommand(scriptPath)`.
 */
export function firewallElevationCommand(scriptPath: string): { file: string; args: string[] } {
  const inner = `-NoProfile -ExecutionPolicy Bypass -File ${quotePs(scriptPath)}`
  return {
    file: 'powershell.exe',
    args: ['-NoProfile', '-Command', `Start-Process -FilePath powershell.exe -Verb RunAs -Wait -ArgumentList ${quotePs(inner)}`],
  }
}

function quotePs(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}
