import type { NetworkInterfaceInfo } from 'node:os'
import { describe, expect, it } from 'vitest'
import { findRadminIpv4 } from './radminAddress'

function ipv4(address: string): NetworkInterfaceInfo {
  return { address, netmask: '255.0.0.0', family: 'IPv4', mac: '00:00:00:00:00:00', internal: false, cidr: `${address}/8` }
}

describe('findRadminIpv4', () => {
  it('devolve o primeiro IPv4 26.x', () => {
    const interfaces = { Ethernet: [ipv4('192.168.0.8')], Radmin: [ipv4('26.186.21.58')] }

    expect(findRadminIpv4(interfaces)).toBe('26.186.21.58')
  })

  it('devolve null quando não há IP do Radmin', () => {
    expect(findRadminIpv4({ Loopback: [ipv4('127.0.0.1')] })).toBeNull()
  })
})
