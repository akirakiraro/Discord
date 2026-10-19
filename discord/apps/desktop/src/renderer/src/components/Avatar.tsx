import { pickAvatarColor } from '../lib/avatarColor'

interface AvatarProps {
  name: string
  seed: string
  speaking?: boolean
  size?: number
}

export function Avatar({ name, seed, speaking = false, size = 32 }: AvatarProps): React.JSX.Element {
  return (
    <div
      className={speaking ? 'avatar avatar--speaking' : 'avatar'}
      style={{ background: pickAvatarColor(seed), width: size, height: size, fontSize: size * 0.45 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
