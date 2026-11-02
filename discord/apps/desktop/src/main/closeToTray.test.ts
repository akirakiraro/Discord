import { describe, expect, it } from 'vitest'
import { createCloseGate, TRAY_MENU, TRAY_NOTICE } from './closeToTray'

describe('o X da janela', () => {
  it('com a bandeja viva esconde em vez de fechar', () => {
    const gate = createCloseGate(() => true)
    expect(gate.shouldHideOnClose()).toBe(true)
    expect(gate.quitting()).toBe(false)
  })

  it('sem bandeja fecha de verdade, para o app não ficar invisível', () => {
    expect(createCloseGate(() => false).shouldHideOnClose()).toBe(false)
  })

  it('depois de pedir para sair deixa fechar', () => {
    const gate = createCloseGate(() => true)
    gate.requestQuit()
    expect(gate.quitting()).toBe(true)
    expect(gate.shouldHideOnClose()).toBe(false)
  })

  it('saída cancelada volta a esconder', () => {
    const gate = createCloseGate(() => true)
    gate.requestQuit()
    gate.cancelQuit()
    expect(gate.quitting()).toBe(false)
    expect(gate.shouldHideOnClose()).toBe(true)
  })

  it('a bandeja é lida na hora do clique, não na criação', () => {
    let alive = false
    const gate = createCloseGate(() => alive)
    expect(gate.shouldHideOnClose()).toBe(false)
    alive = true
    expect(gate.shouldHideOnClose()).toBe(true)
  })
})

describe('textos da bandeja', () => {
  it('o aviso diz que o app está minimizado e como sair', () => {
    expect(TRAY_NOTICE.title).toBe('O SoundRoom continua aberto')
    expect(TRAY_NOTICE.content).toBe(
      'Ele foi minimizado para a bandeja e a call segue ativa. Clique no ícone para abrir ou use Sair para fechar de vez.',
    )
  })

  it('o menu tem abrir e sair', () => {
    expect(TRAY_MENU.open).toBe('Abrir o SoundRoom')
    expect(TRAY_MENU.quit).toBe('Sair do SoundRoom')
  })
})
