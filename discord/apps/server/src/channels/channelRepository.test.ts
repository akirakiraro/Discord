import { beforeEach, describe, expect, it } from 'vitest'
import { IN_MEMORY_DATABASE, openDatabase } from '../db/database'
import { SqliteChannelRepository, toChannelDto, type ChannelRecord } from './channelRepository'

function buildChannel(overrides: Partial<ChannelRecord> = {}): ChannelRecord {
  return { id: 'c-1', name: 'geral', kind: 'text', position: 0, createdAt: '2026-10-19T12:00:00.000Z', ...overrides }
}

describe('SqliteChannelRepository', () => {
  let channels: SqliteChannelRepository

  beforeEach(() => {
    channels = new SqliteChannelRepository(openDatabase(IN_MEMORY_DATABASE))
  })

  it('grava e encontra por id e por nome + tipo', () => {
    channels.insert(buildChannel())

    expect(channels.findById('c-1')?.name).toBe('geral')
    expect(channels.findByName('geral', 'text')?.id).toBe('c-1')
    expect(channels.findByName('geral', 'voice'), 'mesmo nome em outro tipo é outro canal').toBeUndefined()
  })

  it('permite o mesmo nome em tipos diferentes, mas não no mesmo tipo', () => {
    channels.insert(buildChannel())
    channels.insert(buildChannel({ id: 'c-2', kind: 'voice' }))

    expect(() => channels.insert(buildChannel({ id: 'c-3' }))).toThrow(/UNIQUE/)
  })

  it('lista texto antes de voz, cada um pela posição', () => {
    channels.insert(buildChannel({ id: 'v', name: 'call', kind: 'voice', position: 0 }))
    channels.insert(buildChannel({ id: 't2', name: 'memes', position: 1 }))
    channels.insert(buildChannel({ id: 't1', name: 'geral', position: 0 }))

    expect(channels.listAll().map((channel) => channel.id)).toEqual(['t1', 't2', 'v'])
  })

  it('calcula a próxima posição por tipo', () => {
    expect(channels.nextPosition('text')).toBe(0)
    channels.insert(buildChannel({ position: 4 }))

    expect(channels.nextPosition('text')).toBe(5)
    expect(channels.nextPosition('voice')).toBe(0)
  })

  it('toChannelDto não expõe createdAt', () => {
    expect(toChannelDto(buildChannel())).toEqual({ id: 'c-1', name: 'geral', kind: 'text', position: 0 })
  })
})
