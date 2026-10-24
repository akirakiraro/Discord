import { useChatStore } from '../../stores/chatStore'
import { useNavigationStore } from '../../stores/navigationStore'
import { useSessionStore, type AuthSession } from '../../stores/sessionStore'
import { useVoiceRosterStore } from '../../stores/voiceRosterStore'
import { forgetLoginToken } from '../savedLogin'
import { voiceSession } from '../voice/voiceSession'

/**
 * Sai da call, invalida o token no host (se ele responder) e limpa o estado local.
 * Exemplo: `await logout(session)`
 */
export async function logout(session: AuthSession): Promise<void> {
  await voiceSession.leave()
  await session.api.logout().catch(() => undefined)
  forgetLoginToken(window.localStorage)
  useChatStore.getState().resetChat()
  useVoiceRosterStore.getState().resetRoster()
  useNavigationStore.getState().resetView()
  useSessionStore.getState().signOut()
}
