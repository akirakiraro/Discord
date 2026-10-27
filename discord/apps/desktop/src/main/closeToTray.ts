export interface CloseGate {
  quitting(): boolean
  requestQuit(): void
  cancelQuit(): void
  shouldHideOnClose(): boolean
}

/**
 * Decide o que o X da janela faz. Sem pedido de saída e com a bandeja viva, esconde.
 * Sair de verdade (menu da bandeja, atualização, desligar o Windows) liga `requestQuit`.
 * Exemplo: `createCloseGate(() => tray.available).shouldHideOnClose()`
 */
export function createCloseGate(trayAvailable: () => boolean): CloseGate {
  let quitting = false
  return {
    quitting: () => quitting,
    requestQuit: () => {
      quitting = true
    },
    cancelQuit: () => {
      quitting = false
    },
    shouldHideOnClose: () => !quitting && trayAvailable(),
  }
}

export const TRAY_NOTICE = {
  title: 'O SoundRoom continua aberto',
  content: 'Ele foi minimizado para a bandeja e a call segue ativa. Clique no ícone para abrir ou use Sair para fechar de vez.',
} as const

export const TRAY_MENU = {
  open: 'Abrir o SoundRoom',
  quit: 'Sair do SoundRoom',
  tooltip: 'SoundRoom',
} as const
