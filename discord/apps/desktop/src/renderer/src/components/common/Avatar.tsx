import { pickAvatarColor } from '../../lib/avatarColor'

interface AvatarProps {
  name: string
  seed: string
  speaking?: boolean
  /** Mostra a bolinha de status (verde online / cinza offline). */
  online?: boolean
  size?: number
}

export function Avatar({ name, seed, speaking = false, online, size = 32 }: AvatarProps): React.JSX.Element {
  return (
    <div
      className={speaking ? 'avatar avatar--speaking' : 'avatar'}
      style={{ background: pickAvatarColor(seed), width: size, height: size, fontSize: size * 0.45 }}
    >
      {name.charAt(0).toUpperCase()}
      {online !== undefined && <span className={online ? 'avatar__status avatar__status--online' : 'avatar__status'} />}
    </div>
  )
}
