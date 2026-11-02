/**
 * Trava temporária da seção Configurações → Host.
 * true: só o username `akira` (sem diferenciar maiúsculas) vê a seção.
 * false: qualquer pessoa neste PC, desde que o módulo de host exista, vê a seção.
 * A tela de entrar NÃO usa esta trava. Ela aparece quando o módulo é detectado,
 * porque nesse PC ainda não há usuário logado.
 * Para abrir o host a qualquer dono do módulo, mude só esta constante para false.
 */
export const HOST_SETTINGS_REQUIRE_AKIRA = true

/** Username comparado quando a trava está ligada. */
export const HOST_SETTINGS_USERNAME = 'akira'

export interface HostSettingsTab {
  id: 'host'
  label: 'Host'
}

/**
 * Configurações → Host. Exemplo: `canShowHostSettings(true, 'Akira')` → `true`.
 */
export function canShowHostSettings(
  moduleReady: boolean,
  username: string | null | undefined,
  requireAkira: boolean = HOST_SETTINGS_REQUIRE_AKIRA,
): boolean {
  if (!moduleReady) return false
  if (!requireAkira) return true
  return (username ?? '').trim().toLowerCase() === HOST_SETTINGS_USERNAME
}

/**
 * Botão da tela de entrar. Não olha o username. Exemplo: `canShowHostOnLogin(true)`.
 */
export function canShowHostOnLogin(moduleReady: boolean): boolean {
  return moduleReady
}

/**
 * Aba que entra na lista de Configurações. `null` esconde a seção inteira.
 * Exemplo: `hostSettingsTab(true, 'akira')`.
 */
export function hostSettingsTab(moduleReady: boolean, username: string | null | undefined): HostSettingsTab | null {
  if (!canShowHostSettings(moduleReady, username)) return null
  return { id: 'host', label: 'Host' }
}
