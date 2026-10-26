export const API_PORT = 3000
export const LIVEKIT_PORT = 7880
export const HOST_START_TIMEOUT_MS = 20_000
export const HOST_POLL_MS = 500
export const HOST_STOP_TIMEOUT_MS = 5_000

export const HOST_ERROR = {
  noRadmin: 'O Radmin VPN está desligado ou sem IP 26.x. Abra o Radmin, conecte à rede e tente de novo.',
  noNode: 'Não encontrei o Node.js neste PC. Instale o Node 22.23.4 e rode npm run host:setup de novo.',
  noLivekit: 'Falta o LiveKit. Na pasta do repositório, rode: npm run host:install',
  noTsx: 'Não encontrei o tsx para subir a API sem o npm. Na pasta do repositório, rode npm install.',
  timeout: 'O host não respondeu em 20 s. Veja o log em infra/host/logs. Se a porta ficou ocupada, feche o processo e tente de novo.',
  fell: 'O host caiu. A API ou o LiveKit parou de responder.',
  externalStop: 'Este host foi aberto pelo terminal. O app não desliga um processo que ele não iniciou. Feche aquela janela para desligar.',
  alreadyOff: 'O host já está desligado.',
  portsStuck: 'As portas 3000 e 7880 continuam ocupadas depois de desligar.',
  firewallMissing: 'O firewall ainda não tem as regras do SoundRoom. O botão abaixo pede administrador (UAC). O app não muda o firewall sozinho.',
  firewallOk: 'Firewall ok. As regras do SoundRoom já existem para a rede 26.0.0.0/8.',
  firewallReady: 'Firewall pronto. As portas TCP 3000, 7880, 7881 e UDP 50000–50100 foram liberadas para 26.0.0.0/8.',
  firewallCancelled: 'O pedido de administrador foi cancelado. O firewall continua sem as regras do SoundRoom.',
  firewallRanWithoutRules: 'O script rodou, mas as regras SoundRoom não apareceram no firewall.',
} as const

/**
 * Exemplo: `processExitMessage('LiveKit', 1)`.
 */
export function processExitMessage(name: 'LiveKit' | 'API', code: number): string {
  return `O ${name} encerrou com código ${code} antes do host ficar pronto.`
}

/**
 * Exemplo: `portBusyMessage(7880)`.
 */
export function portBusyMessage(port: number): string {
  return `A porta ${port} já está em uso. Feche o host aberto no terminal, ou o programa que está nessa porta, e tente de novo.`
}

/** A API subiu e o LiveKit não. */
export function apiWithoutLiveKitMessage(): string {
  return 'A API responde na porta 3000, mas a porta 7880 do LiveKit não aceita conexão.'
}

/** Algo escuta 7880, mas o /health não veio. */
export function liveKitWithoutApiMessage(): string {
  return 'A porta 7880 está aberta, mas o /health da API na porta 3000 não respondeu.'
}

/**
 * Confirmação do botão Desligar. Exemplo: `stopWarning(2, 1)`.
 */
export function stopWarning(online: number, inVoice: number): string {
  return `Desligar derruba a call de todos. Agora: ${online} pessoas online e ${inVoice} na call.`
}

/**
 * Aviso ao fechar o app com gente conectada. Exemplo: `closeWarning(2, 1)`.
 */
export function closeWarning(online: number, inVoice: number): string {
  return `Fechar o SoundRoom desliga o host e derruba a call de ${online} pessoas online (${inVoice} na call).`
}

/**
 * Código 1223 é o cancelamento do UAC. Exemplo: `firewallElevationFailure(1223, '')`.
 */
export function firewallElevationFailure(code: number, output: string): string {
  if (code === 0) return HOST_ERROR.firewallReady
  if (code === 1223 || /cancel/i.test(output)) return HOST_ERROR.firewallCancelled
  const detail = output.trim() || 'vazia'
  return `Não foi possível abrir o firewall (código ${code}). O Windows precisa de administrador. Saída: ${detail}`
}

export function readError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
