/** Mute, surdo e o mute que valia antes de ensurdecer. Um único estado para os dois botões. */
export interface MicDeafenState {
  micMuted: boolean
  deafened: boolean
  micMutedBeforeDeafen: boolean
}

export const OPEN_MIC: MicDeafenState = {
  micMuted: false,
  deafened: false,
  micMutedBeforeDeafen: false,
}

/**
 * Alterna o microfone. Surdo não convive com fala: o clique no microfone
 * tira o surdo e desmuta o microfone juntos.
 * Exemplo: `applyMicToggle({ micMuted: true, deafened: true, micMutedBeforeDeafen: true })`
 * devolve microfone e áudio ligados.
 */
export function applyMicToggle(state: MicDeafenState): MicDeafenState {
  if (state.deafened) return OPEN_MIC
  return { ...state, micMuted: !state.micMuted }
}

/**
 * Alterna o surdo. Entrar guarda o mute e cala o microfone.
 * Sair por este botão devolve esse mute, sem ligar a fala se ela já estava cortada.
 * Exemplo: `applyDeafenToggle(OPEN_MIC).micMuted` é `true`.
 */
export function applyDeafenToggle(state: MicDeafenState): MicDeafenState {
  if (state.deafened) return releaseDeafen(state)
  return holdDeafen(state)
}

/**
 * Texto do botão de microfone. Surdo não trava o botão: o clique desmuta os dois.
 * Exemplo: `micButtonTitle({ micMuted: true, deafened: true })` é `Desmutar e ouvir`.
 */
export function micButtonTitle(state: Pick<MicDeafenState, 'micMuted' | 'deafened'>): string {
  if (state.deafened) return 'Desmutar e ouvir'
  return state.micMuted ? 'Desmutar' : 'Mutar'
}

/**
 * Exemplo: `deafenButtonTitle(true)` é `Desensurdecer`.
 */
export function deafenButtonTitle(deafened: boolean): string {
  return deafened ? 'Desensurdecer' : 'Ensurdecer'
}

/**
 * Por que o Me ouvir não pode abrir. `null` quando o microfone está no ar.
 * Exemplo: `blockedEarReason({ micMuted: true, deafened: true })` cita o surdo.
 */
export function blockedEarReason(state: Pick<MicDeafenState, 'micMuted' | 'deafened'>): string | null {
  if (state.deafened) return 'Você está surdo. O microfone fica mutado, então o Me ouvir não abre.'
  if (state.micMuted) return 'O microfone está mutado. Ligue ele para se ouvir.'
  return null
}

function holdDeafen(state: MicDeafenState): MicDeafenState {
  return { micMuted: true, deafened: true, micMutedBeforeDeafen: state.micMuted }
}

function releaseDeafen(state: MicDeafenState): MicDeafenState {
  return { micMuted: state.micMutedBeforeDeafen, deafened: false, micMutedBeforeDeafen: false }
}
