import { DisconnectReason } from 'livekit-client'

const DISCONNECT_MESSAGES: Partial<Record<DisconnectReason, string>> = {
  [DisconnectReason.DUPLICATE_IDENTITY]: 'Você entrou na call por outro dispositivo.',
  [DisconnectReason.SERVER_SHUTDOWN]: 'O servidor de voz do host foi desligado.',
  [DisconnectReason.PARTICIPANT_REMOVED]: 'Você foi removido da call.',
  [DisconnectReason.ROOM_DELETED]: 'A sala de voz foi encerrada.',
  [DisconnectReason.JOIN_FAILURE]: 'Não foi possível entrar na call. O firewall do host está liberado?',
}

/**
 * Mensagem para o usuário quando a call cai; `null` quando foi ele mesmo que saiu ou trocou de canal.
 * Exemplo: `describeVoiceDisconnect(DisconnectReason.DUPLICATE_IDENTITY)`
 */
export function describeVoiceDisconnect(reason: DisconnectReason | undefined): string | null {
  if (reason === DisconnectReason.CLIENT_INITIATED) return null
  return (reason !== undefined && DISCONNECT_MESSAGES[reason]) || 'A conexão de voz caiu.'
}
