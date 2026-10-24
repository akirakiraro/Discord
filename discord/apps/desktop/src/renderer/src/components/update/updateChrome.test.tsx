import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { UpdateSnapshot } from '../../../../shared/desktopUpdateSnapshot'
import { UpdateBlockScreen } from './UpdateBlockScreen'
import { UpdateChrome } from './UpdateChrome'
import { UpdateRestartModal } from './UpdateRestartModal'

const noop = (): void => undefined

describe('tela de atualização', () => {
  it('substitui o login pela mensagem de falha e pelo botão de tentar de novo', () => {
    const html = renderToStaticMarkup(
      <UpdateBlockScreen
        snapshot={errorSnapshot()}
        onRetry={noop}
      />,
    )

    expect(html).toContain('Atualizando o Radcord...')
    expect(html).toContain('Sem conexão para atualizar o Radcord')
    expect(html).toContain('Tentar novamente')
    expect(html).not.toContain('Entrar no Radcord')
  })

  it('mostra a barra e a porcentagem no cartão enquanto baixa', () => {
    const html = renderToStaticMarkup(
      <UpdateChrome snapshot={downloadingSnapshot()} onRetry={noop} onInstall={noop} />,
    )

    expect(html).toContain('Baixando 0.1.117')
    expect(html).toContain('40%')
    expect(html).toContain('progressbar')
    expect(html).not.toContain('Reiniciar o Radcord')
  })

  it('abre o modal com OK quando o download terminou', () => {
    const html = renderToStaticMarkup(<UpdateRestartModal version="0.1.117" onInstall={noop} />)

    expect(html).toContain('Reiniciar o Radcord')
    expect(html).toContain('0.1.117')
    expect(html).toContain('>OK<')
  })
})

function errorSnapshot(): UpdateSnapshot {
  return {
    phase: 'error',
    version: null,
    progress: null,
    message: 'Sem conexão para atualizar o Radcord. Confira a internet e tente de novo.',
  }
}

function downloadingSnapshot(): UpdateSnapshot {
  return {
    phase: 'downloading',
    version: '0.1.117',
    progress: { percent: 40, bytesPerSecond: 2048, transferred: 400, total: 1000 },
    message: null,
  }
}
