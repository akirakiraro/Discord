import { describe, expect, it } from 'vitest'
import { measureHostPingMs } from './hostApi'
import { FakeHostFetch } from './testing/fakeHostFetch'

class SteppingClock {
  private readonly readings: number[]

  constructor(...readings: number[]) {
    this.readings = readings
  }

  readonly now = (): number => this.readings.shift() ?? 0
}

const BASE_URL = 'http://26.186.21.58:3000'

describe('measureHostPingMs', () => {
  it('devolve o tempo entre o início e o fim do /health', async () => {
    const host = new FakeHostFetch(() => Response.json({ status: 'ok' }))
    const clock = new SteppingClock(100, 142.4)

    const ping = await measureHostPingMs(BASE_URL, host.fetch, clock.now)

    expect(ping, 'ping arredondado em ms').toBe(42)
    expect(host.calls[0]?.url).toBe(`${BASE_URL}/health`)
  })

  it('falha citando o status quando o host não responde 200', async () => {
    const host = new FakeHostFetch(() => new Response('x', { status: 503 }))

    await expect(measureHostPingMs(BASE_URL, host.fetch)).rejects.toThrow(/503/)
  })
})
