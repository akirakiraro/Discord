import type { MemberDto } from '@radcord/shared'

export interface MemberGroups {
  online: MemberDto[]
  offline: MemberDto[]
}

const byDisplayName = (a: MemberDto, b: MemberDto): number => a.displayName.localeCompare(b.displayName, 'pt-BR')

/**
 * Separa a lista lateral em "Online" e "Offline", cada uma em ordem alfabética.
 * Exemplo: `const { online, offline } = groupMembers(Object.values(members))`
 */
export function groupMembers(members: MemberDto[]): MemberGroups {
  const sorted = [...members].sort(byDisplayName)
  return { online: sorted.filter((member) => member.online), offline: sorted.filter((member) => !member.online) }
}
