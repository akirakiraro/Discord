import { useChatStore } from '../../stores/chatStore'

export interface MemberFace {
  name: string
  imageUrl: string | null | undefined
}

/**
 * Nome e foto do cadastro, para a chamada mostrar o mesmo avatar do perfil.
 * Exemplo: `const face = useMemberFace(participant.identity, participant.name)`
 */
export function useMemberFace(identity: string, fallbackName: string): MemberFace {
  const member = useChatStore((store) => store.chat.members[identity])
  return { name: member?.displayName || fallbackName, imageUrl: member?.avatarUrl }
}
