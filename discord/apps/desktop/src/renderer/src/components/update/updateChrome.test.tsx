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

    expect(html).toContain('Atualizando o SoundRoom...')
    expect(html).toContain('Sem conexão para atualizar o SoundRoom')
    expect(html).toContain('Tentar novamente')
    expect(html).not.toContain('Entrar no SoundRoom')
  })

  it('mostra a barra e a porcentagem no cartão enquanto baixa', () => {
    const html = renderToStaticMarkup(
      <UpdateChrome snapshot={downloadingSnapshot()} onRetry={noop} onInstall={noop} />,
    )

    expect(html).toContain('Baixando 0.1.117')
    expect(html).toContain('40%')
    expect(html).toContain('progressbar')
    expect(html).not.toContain('Reiniciar o SoundRoom')
  })

  it('abre o modal com OK quando o download terminou', () => {
    const html = renderToStaticMarkup(<UpdateRestartModal version="0.1.117" onInstall={noop} />)

    expect(html).toContain('Reiniciar o SoundRoom')
    expect(html).toContain('0.1.117')
    expect(html).toContain('>OK<')
  })

  it('depois do OK a tela e o cartão avisam que o app fecha sozinho, sem porcentagem', () => {
    const html = renderToStaticMarkup(
      <>
        <UpdateBlockScreen snapshot={installingSnapshot()} onRetry={noop} />
        <UpdateChrome snapshot={installingSnapshot()} onRetry={noop} onInstall={noop} />
      </>,
    )

    expect(html).toContain('Instalando... o SoundRoom vai fechar e reabrir sozinho.')
    expect(html).toContain('Instalando...')
    expect(html).toContain('O SoundRoom vai fechar e reabrir sozinho.')
    expect(html).toContain('progressbar')
    expect(html).toContain('update-corner__fill--indeterminate')
    expect(html).not.toContain('aria-valuenow')
    expect(html).not.toContain('Reiniciar o SoundRoom')
    expect(html).not.toContain('>OK<')
  })
})

function errorSnapshot(): UpdateSnapshot {
  return {
    phase: 'error',
    version: null,
    progress: null,
    message: 'Sem conexão para atualizar o SoundRoom. Confira a internet e tente de novo.',
  }
}

function installingSnapshot(): UpdateSnapshot {
  return { phase: 'installing', version: '0.1.119', progress: null, message: null }
}

function downloadingSnapshot(): UpdateSnapshot {
  return {
    phase: 'downloading',
    version: '0.1.117',
    progress: { percent: 40, bytesPerSecond: 2048, transferred: 400, total: 1000 },
    message: null,
  }
}
