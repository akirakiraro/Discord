import type { NetworkInterfaceInfo } from 'node:os'

/**
 * Primeiro IPv4 da faixa do Radmin (26.0.0.0/8) entre as interfaces da máquina.
 * Exemplo: `findRadminIpv4(networkInterfaces())` → `'26.186.21.58'`
 */
export function findRadminIpv4(interfaces: NodeJS.Dict<NetworkInterfaceInfo[]>): string | null {
  for (const addresses of Object.values(interfaces)) {
    const match = (addresses ?? []).find((address) => address.family === 'IPv4' && address.address.startsWith('26.'))
    if (match) return match.address
  }
  return null
}
