import { describe, expect, it } from 'vitest'
import type { MemberDto } from '@radcord/shared'
import { groupMembers } from './groupMembers'

function member(displayName: string, online: boolean): MemberDto {
  return { id: displayName, username: displayName.toLowerCase(), displayName, createdAt: 'x', online }
}

describe('groupMembers', () => {
  it('separa online e offline, em ordem alfabética com acentos', () => {
    const groups = groupMembers([member('Zeca', true), member('Ágata', false), member('Bia', true), member('Caio', false)])

    expect(groups.online.map((m) => m.displayName)).toEqual(['Bia', 'Zeca'])
    expect(groups.offline.map((m) => m.displayName)).toEqual(['Ágata', 'Caio'])
  })

  it('funciona com 50 membros', () => {
    const members = Array.from({ length: 50 }, (_unused, index) => member(`M${String(index).padStart(2, '0')}`, index % 2 === 0))

    const groups = groupMembers(members)

    expect(groups.online).toHaveLength(25)
    expect(groups.offline).toHaveLength(25)
  })
})
