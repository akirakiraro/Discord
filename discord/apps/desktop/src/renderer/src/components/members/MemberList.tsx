import { useMemo, useState } from 'react'
import type { MemberDto } from '@radcord/shared'
import { groupMembers } from '../../lib/chat/groupMembers'
import { useChatStore } from '../../stores/chatStore'
import { Avatar } from '../common/Avatar'
import { ProfileModal } from '../user/ProfileModal'

function MemberSection({
  title,
  members,
  onOpen,
}: {
  title: string
  members: MemberDto[]
  onOpen: (member: MemberDto) => void
}): React.JSX.Element | null {
  if (members.length === 0) return null
  return (
    <section>
      <h3 className="member-list__title">
        {title} — {members.length}
      </h3>
      <ul>
        {members.map((member) => (
          <li key={member.id}>
            <button
              type="button"
              className={member.online ? 'member' : 'member member--offline'}
              onClick={() => onOpen(member)}
            >
              <Avatar name={member.displayName} seed={member.id} imageUrl={member.avatarUrl} online={member.online} />
              <span className="member__name">{member.displayName}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function MemberList(): React.JSX.Element {
  const members = useChatStore((store) => store.chat.members)
  const { online, offline } = useMemo(() => groupMembers(Object.values(members)), [members])
  const [selected, setSelected] = useState<MemberDto | null>(null)

  return (
    <aside className="member-list">
      <MemberSection title="Online" members={online} onOpen={setSelected} />
      <MemberSection title="Offline" members={offline} onOpen={setSelected} />
      {selected && <ProfileModal user={selected} onClose={() => setSelected(null)} />}
    </aside>
  )
}
