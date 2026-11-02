import { describe, expect, it } from 'vitest'
import type { ChannelDto } from '@radcord/shared'
import { requestBotToken, resolveVoiceChannel, type FetchLike } from './hostCalls'

const CHANNELS: ChannelDto[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'geral', kind: 'text' } as ChannelDto,
  { id: '22222222-2222-4222-8222-222222222222', name: 'Geral', kind: 'voice' } as ChannelDto,
]

function replying(status: number, body: unknown): { fetchFn: FetchLike; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fetchFn: FetchLike = async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(body), { status })
  }
  return { fetchFn, calls }
}

describe('chamadas do bot ao host', () => {
  it('acha o canal de voz pelo nome, ignorando o de texto homônimo', async () => {
    const { fetchFn, calls } = replying(200, CHANNELS)
    const channel = await resolveVoiceChannel('http://h:3000', 'sess', 'GERAL', fetchFn)
    expect(channel.id).toBe('22222222-2222-4222-8222-222222222222')
    expect(calls[0]?.url).toBe('http://h:3000/channels')
    expect(new Headers(calls[0]?.init?.headers).get('authorization')).toBe('Bearer sess')
  })

  it('canal inexistente lista os de voz', async () => {
    const { fetchFn } = replying(200, CHANNELS)
    await expect(resolveVoiceChannel('http://h:3000', 's', 'Jogos', fetchFn)).rejects.toThrow(/os canais de voz são: Geral/)
  })

  it('404 no token diz para ligar RADCORD_DEV_TOOLS', async () => {
    const { fetchFn, calls } = replying(404, { error: 'not_found' })
    await expect(requestBotToken('http://h:3000', 's', 'c', 2, fetchFn)).rejects.toThrow(/RADCORD_DEV_TOOLS=1/)
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ channelId: 'c', botNumber: 2 }))
  })

  it('401 pede para entrar de novo', async () => {
    const { fetchFn } = replying(401, {})
    await expect(requestBotToken('http://h:3000', 's', 'c', 1, fetchFn)).rejects.toThrow(/entre de novo/)
  })
})
