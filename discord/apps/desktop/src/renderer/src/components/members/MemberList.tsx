import { useMemo } from 'react'
import type { MemberDto } from '@radcord/shared'
import { groupMembers } from '../../lib/chat/groupMembers'
import { useChatStore } from '../../stores/chatStore'
import { Avatar } from '../common/Avatar'

function MemberSection({ title, members }: { title: string; members: MemberDto[] }): React.JSX.Element | null {
  if (members.length === 0) return null
  return (
    <section>
      <h3 className="member-list__title">
        {title} — {members.length}
      </h3>
      <ul>
        {members.map((member) => (
          <li key={member.id} className={member.online ? 'member' : 'member member--offline'}>
            <Avatar name={member.displayName} seed={member.id} imageUrl={member.avatarUrl} online={member.online} />
            <span className="member__name">{member.displayName}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function MemberList(): React.JSX.Element {
  const members = useChatStore((store) => store.chat.members)
  const { online, offline } = useMemo(() => groupMembers(Object.values(members)), [members])

  return (
    <aside className="member-list">
      <MemberSection title="Online" members={online} />
      <MemberSection title="Offline" members={offline} />
    </aside>
  )
}
