import { describe, expect, it } from 'vitest'
import { updateBlocksLogin, type UpdateSnapshot } from '../../../../shared/desktopUpdateSnapshot'
import { formatByteSize, formatUpdateProgress, updateBlockBody, updateCardDetail, updateCardTitle, updatePercent } from './updateView'

const ERROR: UpdateSnapshot = {
  phase: 'error',
  version: null,
  progress: null,
  message: 'Sem conexão para atualizar o Radcord. Confira a internet e tente de novo.',
}

describe('updateView', () => {
  it('bloqueia o login em todas as fases que ainda não estão em dia', () => {
    const phases: UpdateSnapshot['phase'][] = ['checking', 'downloading', 'ready', 'error']
    for (const phase of phases) {
      expect(updateBlocksLogin({ phase, version: null, progress: null, message: null }), phase).toBe(true)
    }
    expect(updateBlocksLogin({ phase: 'current', version: null, progress: null, message: null })).toBe(false)
    expect(updateBlocksLogin({ phase: 'skipped', version: null, progress: null, message: null })).toBe(false)
  })

  it('mostra porcentagem, velocidade e tamanho quando o download informa', () => {
    const progress = { percent: 40.2, bytesPerSecond: 2048, transferred: 400, total: 1000 }
    const snapshot: UpdateSnapshot = { phase: 'downloading', version: '0.1.117', progress, message: null }

    expect(updateCardTitle(snapshot)).toBe('Baixando 0.1.117')
    expect(updatePercent(snapshot)).toBe(40.2)
    expect(formatUpdateProgress(progress)).toBe('40% · 2,0 KB/s · 400 B de 1000 B')
    expect(updateCardDetail(snapshot)).toBe('40% · 2,0 KB/s · 400 B de 1000 B')
  })

  it('omite velocidade e tamanho quando o updater não mandou', () => {
    expect(formatUpdateProgress({ percent: 10, bytesPerSecond: 0, transferred: 0, total: 0 })).toBe('10%')
    expect(formatByteSize(1536)).toBe('1,5 KB')
  })

  it('na falha a tela fica com a mensagem e o cartão marca pendente', () => {
    expect(updateBlockBody(ERROR)).toMatch(/Sem conexão/)
    expect(updateCardTitle(ERROR)).toBe('Atualização pendente')
    expect(updateCardDetail(ERROR)).toMatch(/Sem conexão/)
    expect(updatePercent(ERROR)).toBeNull()
  })

  it('pronto para instalar mostra 100%', () => {
    const ready: UpdateSnapshot = { phase: 'ready', version: '0.1.117', progress: null, message: null }

    expect(updateCardTitle(ready)).toBe('Pronto para instalar')
    expect(updatePercent(ready)).toBe(100)
    expect(updateBlockBody(ready)).toMatch(/reiniciar/)
  })
})
