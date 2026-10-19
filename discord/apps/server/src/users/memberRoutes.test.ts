import { describe, expect, it } from 'vitest'
import { PresenceTracker } from '../realtime/presenceTracker'
import { InMemoryUserRepository } from '../testing/fakes'
import { listMembers } from './memberRoutes'

describe('listMembers', () => {
  it('marca quem está online e não expõe a senha', () => {
    const users = new InMemoryUserRepository()
    users.insert({ id: 'u-1', username: 'akira', displayName: 'Akira', passwordHash: 'h', createdAt: 'x' })
    users.insert({ id: 'u-2', username: 'bia', displayName: 'Bia', passwordHash: 'h', createdAt: 'x' })
    const presence = new PresenceTracker()
    presence.connect('u-2')

    const members = listMembers(users, presence)

    expect(members.map((member) => [member.username, member.online])).toEqual([
      ['akira', false],
      ['bia', true],
    ])
    expect(members[0]).not.toHaveProperty('passwordHash')
  })
})
